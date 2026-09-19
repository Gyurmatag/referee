export function coreHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
  };
}
