export function getStatusColor(status: string): string {
  if (status === 'INBOX') return 'bg-red-500';
  if (status === 'Waiting') return 'bg-orange-500';
  if (status === 'Going') return 'bg-purple-500';
  if (status === 'Done') return 'bg-green-500';
  return 'bg-gray-500';
}

type scheme = 'notion' | 'https';
export const getNotionLinkById = (id: string, scheme?: scheme) => {
  const returnScheme = scheme || 'https';
  return `${returnScheme}://notion.so/${id.replace(/-/g, '')}`;
};
