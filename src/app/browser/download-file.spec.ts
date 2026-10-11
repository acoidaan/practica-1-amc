import { downloadTextFile } from './download-file';

afterEach(() => {
  vi.restoreAllMocks();
});

it('downloads text through a temporary object URL and releases it', async () => {
  const createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const appendChildSpy = vi.spyOn(document.body, 'appendChild');
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => undefined);

  downloadTextFile('dataset2.tsp', 'TSPLIB contents');

  expect(createObjectUrlSpy).toHaveBeenCalledOnce();
  const blob = createObjectUrlSpy.mock.calls[0][0];
  if (!(blob instanceof Blob)) {
    throw new Error('Expected createObjectURL to receive a Blob');
  }
  expect(blob.type).toBe('text/plain;charset=utf-8');
  expect(await blob.text()).toBe('TSPLIB contents');

  const link = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
  expect(link.href).toBe('blob:test');
  expect(link.download).toBe('dataset2.tsp');
  expect(clickSpy).toHaveBeenCalledOnce();
  expect(link.isConnected).toBe(false);
  expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:test');
});
