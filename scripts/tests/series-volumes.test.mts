import { test } from "node:test";
import assert from "node:assert/strict";
import { sortVolumesByNumber } from "@/lib/seriesVolumes";

test("series volumes always follow numeric reading order, including Volume 0", () => {
  const volumes = [
    { id: "vol-42", volumeNumber: 42 },
    { id: "vol-10", volumeNumber: 10 },
    { id: "vol-2", volumeNumber: 2 },
    { id: "vol-0", volumeNumber: 0 },
    { id: "vol-1", volumeNumber: 1 },
  ];

  assert.deepEqual(
    sortVolumesByNumber(volumes).map((volume) => volume.volumeNumber),
    [0, 1, 2, 10, 42]
  );
  assert.deepEqual(
    volumes.map((volume) => volume.volumeNumber),
    [42, 10, 2, 0, 1],
    "sorting the archive must not mutate the catalogue"
  );
});

test("unnumbered catalogue entries stay visible after numbered volumes", () => {
  const ordered = sortVolumesByNumber([
    { id: "unknown", volumeNumber: "not-numbered" },
    { id: "one", volumeNumber: 1 },
  ]);

  assert.deepEqual(ordered.map((volume) => volume.id), ["one", "unknown"]);
});
