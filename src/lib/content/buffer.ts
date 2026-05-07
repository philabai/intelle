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
};

async function resolveOrgId(): Promise<string | null> {
  if (process.env.BUFFER_ORGANIZATION_ID) return process.env.BUFFER_ORGANIZATION_ID;
  const result = await bufferGraphQL<{
    account: { id: string; organizations: { id: string; name: string }[] };
  }>(`query { account { id organizations { id name } } }`);
  const orgs = result.data?.account?.organizations;
  if (orgs?.length) return orgs[0].id;
  return result.data?.account?.id ?? null;
}

export async function listChannels(): Promise<BufferProfile[]> {
  const orgId = await resolveOrgId();
  if (!orgId) throw new Error("Buffer organization not found");

  const result = await bufferGraphQL<{
    channels: {
      id: string;
      name: string;
      displayName: string;
      service: string;
      avatar: string;
    }[];
  }>(
    `query GetChannels($orgId: OrganizationId!) {
      channels(input: { organizationId: $orgId }) {
        id name displayName service avatar
      }
    }`,
    { orgId }
  );

  return (result.data?.channels ?? []).map((c) => ({
    id: c.id,
    service: c.service,
    name: c.name,
    displayName: c.displayName,
    avatar: c.avatar,
  }));
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
