const SLEEPER_BASE_URL = "https://api.sleeper.app/v1";

export async function sleeperFetch<T>(
  path: string,
  revalidate: number = 300
): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE_URL}${path}`, {
    next: { revalidate },
  });

  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} for ${path}`);
  }

  return res.json();
}
