export function getUserId(): string {
  let id = localStorage.getItem('midnightledger_uid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('midnightledger_uid', id);
  }
  return id;
}
