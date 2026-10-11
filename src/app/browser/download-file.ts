export function downloadTextFile(fileName: string, sourceText: string): void {
  const blob = new Blob([sourceText], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
