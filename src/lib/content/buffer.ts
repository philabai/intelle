const BUFFER_API = "https://api.buffer.com";

function token() {
  const t = process.env.BUFFER_ACCESS_TOKEN;
  if (!t) throw new Error("BUFFER_ACCESS_TOKEN is not set");
  return t;
}

async function bufferGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<{ data?: T; errors?: { message: string }[] }> {
  const res = await fetch(BUFFER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

export type BufferProfile = {
  id: string;
  service: string;
  name: string;
  displayName: string;
  avatar: string;
  organizationId: string;
  organizationName: string | null;
};

type BufferChannel = {
  id: string;
  name: string;
  displayName: string;
  service: string;
  avatar: string;
};

export type ChannelsDebug = {
  account_query_errors: string[];
  account_id: string | null;
  organizations_from_account: { id: string; name: string }[];
  configured_org_id: string | null;
  per_org_results: {
    organizationId: string;
    organizationName: string | null;
    variable_form_channel_count: number;
    variable_form_errors: string[];
    inline_form_channel_count: number;
    inline_form_errors: string[];
  }[];
};

async function listOrganizationsWithDebug(debug: ChannelsDebug): Promise<{ id: string; name: string | null }[]> {
  const explicit = process.env.BUFFER_ORGANIZATION_ID || null;
  debug.configured_org_id = explicit;

  const result = await bufferGraphQL<{
    account: { id: string; organizations: { id: string; name: string }[] };
  }>(`query { account { id organizations { id name } } }`);

  if (result.errors?.length) {
    debug.account_query_errors = result.errors.map((e) => e.message);
  }
  debug.account_id = result.data?.account?.id ?? null;
  const orgs = result.data?.account?.organizations ?? [];
  debug.organizations_from_account = orgs;

  if (explicit) {
    const match = orgs.find((o) => o.id === explicit);
    return [{ id: explicit, name: match?.name ?? null }];
  }
  if (orgs.length) return orgs.map((o) => ({ id: o.id, name: o.name }));
  const accountId = result.data?.account?.id;
  if (accountId) return [{ id: accountId, name: null }];
  return [];
}

async function channelsForOrgWithDebug(
  orgId: string,
  orgName: string | null,
  debug: ChannelsDebug
): Promise<BufferChannel[]> {
  const variableForm = await bufferGraphQL<{ channels: BufferChannel[] }>(
    `query GetChannels($orgId: OrganizationId!) {
      channels(input: { organizationId: $orgId }) {
        id name displayName service avatar
      }
    }`,
    { orgId }
  );
  const variableChannels = variableForm.data?.channels ?? [];
  const variableErrors = variableForm.errors?.map((e) => e.message) ?? [];

  let inlineChannels: BufferChannel[] = [];
  let inlineErrors: string[] = [];
  if (!variableChannels.length) {
    const inlineForm = await bufferGraphQL<{ channels: BufferChannel[] }>(
      `query GetChannels {
        channels(input: { organizationId: "${orgId}" }) {
          id name displayName service avatar
        }
      }`
    );
    inlineChannels = inlineForm.data?.channels ?? [];
    inlineErrors = inlineForm.errors?.map((e) => e.message) ?? [];
  }

  debug.per_org_results.push({
    organizationId: orgId,
    organizationName: orgName,
    variable_form_channel_count: variableChannels.length,
    variable_form_errors: variableErrors,
    inline_form_channel_count: inlineChannels.length,
    inline_form_errors: inlineErrors,
  });

  return variableChannels.length ? variableChannels : inlineChannels;
}

export async function listChannels(): Promise<{
  profiles: BufferProfile[];
  debug: ChannelsDebug;
}> {
  const debug: ChannelsDebug = {
    account_query_errors: [],
    account_id: null,
    organizations_from_account: [],
    configured_org_id: null,
    per_org_results: [],
  };
  const orgs = await listOrganizationsWithDebug(debug);
  const all: BufferProfile[] = [];
  for (const org of orgs) {
    const channels = await channelsForOrgWithDebug(org.id, org.name, debug);
    for (const c of channels) {
      all.push({
        id: c.id,
        service: c.service,
        name: c.name,
        displayName: c.displayName,
        avatar: c.avatar,
        organizationId: org.id,
        organizationName: org.name,
      });
    }
  }
  return { profiles: all, debug };
}

export type SchedulePostInput = {
  channelId: string;
  text: string;
  /** ISO datetime — if provided, schedules at that exact time; otherwise posts immediately. */
  dueAt?: string;
};

export async function schedulePost(
  input: SchedulePostInput
): Promise<{ postId: string }> {
  const useScheduled = !!input.dueAt;
  const mutation = useScheduled
    ? `mutation CreatePost($text: String!, $channelId: ChannelId!, $dueAt: DateTime!) {
        createPost(input: {
          text: $text, channelId: $channelId,
          schedulingType: automatic, mode: customScheduled, dueAt: $dueAt
        }) {
          ... on PostActionSuccess { post { id } }
          ... on MutationError { message }
        }
      }`
    : `mutation CreatePost($text: String!, $channelId: ChannelId!) {
        createPost(input: {
          text: $text, channelId: $channelId,
          schedulingType: automatic, mode: addToQueue
        }) {
          ... on PostActionSuccess { post { id } }
          ... on MutationError { message }
        }
      }`;

  const variables: Record<string, unknown> = {
    text: input.text,
    channelId: input.channelId,
  };
  if (useScheduled) variables.dueAt = new Date(input.dueAt!).toISOString();

  const result = await bufferGraphQL<{
    createPost: { post?: { id: string }; message?: string };
  }>(mutation, variables);

  const postId = result.data?.createPost?.post?.id;
  if (!postId) {
    const msg =
      result.data?.createPost?.message ||
      result.errors?.[0]?.message ||
      "Buffer createPost failed";
    throw new Error(msg);
  }
  return { postId };
}

/** Twitter character cap: Buffer counts an attached URL as ~23 chars. We don't attach media,
 * so we keep the body ≤ 270 to be safe (Claude prompt enforces this too). */
export function clampTwitter(text: string): string {
  if (text.length <= 280) return text;
  return text.slice(0, 277) + "...";
}
