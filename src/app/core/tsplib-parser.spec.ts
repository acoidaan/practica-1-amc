import { parseTsplib } from './tsplib-parser';

it('parses a valid TSPLIB dataset', () => {
  const sourceText = `NAME: example
TYPE: TSP
DIMENSION: 2
NODE_COORD_SECTION
7 1.5 2.5
9 3.0 4.0
EOF`;

  const dataset = parseTsplib('example.tsp', sourceText);

  expect(dataset).toEqual({
    fileName: 'example.tsp',
    points: [
      { id: 7, x: 1.5, y: 2.5 },
      { id: 9, x: 3, y: 4 },
    ],
    sourceText,
  });
});

it('parses flexible spacing and scientific notation', () => {
  const sourceText = `DIMENSION : 2
NODE_COORD_SECTION
  7   1.11630e+03   -2.5
  9   4.2e-1    0
EOF`;
  const dataset = parseTsplib('example.tsp', sourceText);

  expect(dataset.points).toEqual([
    { id: 7, x: 1116.3, y: -2.5 },
    { id: 9, x: 0.42, y: 0 },
  ]);
});

it('rejects a missing DIMENSION', () => {
  const sourceText = `NODE_COORD_SECTION
1 0 0
EOF`;

  const action = () => parseTsplib('bad.tsp', sourceText);
  expect(action).toThrow('Missing DIMENSION');
});

it('rejects an invalid DIMENSION', () => {
  const sourceText = `DIMENSION: 2.5
NODE_COORD_SECTION
1 0 0
2 1 1
EOF`;
  const action = () => parseTsplib('bad.tsp', sourceText);
  expect(action).toThrow('Invalid DIMENSION');
});

it('rejects a missing NODE_COORD_SECTION', () => {
  const sourceText = `DIMENSION: 1
1 0 0
EOF`;
  const action = () => parseTsplib('bad.tsp', sourceText);
  expect(action).toThrow('Missing NODE_COORD_SECTION');
});

it('rejects a malformed coordinate row', () => {
  const sourceText = `DIMENSION: 1
NODE_COORD_SECTION
1 0
EOF`;
  const action = () => parseTsplib('bad.tsp', sourceText);
  expect(action).toThrow('Invalid coordinate row');
});

it('rejects a non-numeric coordinate', () => {
  const sourceText = `DIMENSION: 1
NODE_COORD_SECTION
1 abc 0
EOF`;
  const action = () => parseTsplib('bad.tsp', sourceText);
  expect(action).toThrow('Invalid coordinate row');
});

it('rejects a point count different from DIMENSION', () => {
  const sourceText = `DIMENSION: 2
NODE_COORD_SECTION
1 0 0
EOF`;
  const action = () => parseTsplib('bad.tsp', sourceText);
  expect(action).toThrow('Point count does not match DIMENSION');
});
