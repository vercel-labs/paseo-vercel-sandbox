export async function withinDeadline<T>(work: () => Promise<T>, milliseconds = 260_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("operation_deadline")), milliseconds); }),
    ]);
  } finally { clearTimeout(timer); }
}
