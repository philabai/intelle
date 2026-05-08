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

async function listOrganizations(): Promise<{ id: string; name: string | null }[]> {
  // If an explicit org id is configured, query just that one (still match its name if available).
  const explicit = process.env.BUFFER_ORGANIZATION_ID;
  const result = await bufferGraphQL<{
    account: { id: string; organizations: { id: string; name: string }[] };
  }>(`query { account { id organizations { id name } } }`);

  const orgs = result.data?.account?.organizations ?? [];
  if (explicit) {
    const match = orgs.find((o) => o.id === explicit);
    return [{ id: explicit, name: match?.name ?? null }];
  }
  if (orgs.length) return orgs.map((o) => ({ id: o.id, name: o.name }));
  // Fallback: some accounts return only an id at the account level.
  const accountId = result.data?.account?.id;
  if (accountId) return [{ id: accountId, name: null }];
  return [];
}

async function channelsForOrg(orgId: string): Promise<BufferChannel[]> {
  // Variable form first.
  const variableForm = await bufferGraphQL<{ channels: BufferChannel[] }>(
    `query GetChannels($orgId: OrganizationId!) {
      channels(input: { organizationId: $orgId }) {
        id name displayName service avatar
      }
    }`,
    { orgId }
  );
  if (variableForm.data?.channels?.length) return variableForm.data.channels;

  // Inline-string fallback — Buffer's API has been seen to return empty for the variable form
  // even when channels exist for the org. Same fallback Sathi.fit uses.
  const inlineForm = await bufferGraphQL<{ channels: BufferChannel[] }>(
    `query GetChannels {
      channels(input: { organizationId: "${orgId}" }) {
        id name displayName service avatar
      }
    }`
  );
  return inlineForm.data?.channels ?? [];
}

export async function listChannels(): Promise<BufferProfile[]> {
  const orgs = await listOrganizations();
  if (!orgs.length) throw new Error("Buffer organization not found");

  const all: BufferProfile[] = [];
  for (const org of orgs) {
    const channels = await channelsForOrg(org.id);
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
  return all;
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
