import { TypeRegistry, Raw, Tuple } from "@polkadot/types";
import { hexToU8a } from "@polkadot/util";
import { blake2AsHex } from "@polkadot/util-crypto";
import { SubstrateBlock } from "@subql/types";
import { NodeEntity } from "../types/models/NodeEntity";

const registry = new TypeRegistry();

export class BlockHandler {
  private block: SubstrateBlock;

  // assert_eq!(get_peaks(leaf_index_to_mmr_size(1394000)), vec![2097150, 2621437, 2752508, 2785275, 2787322, 2787833, 2787960, 2787991, 2787992]);
  private readonly peaks: [number, string][] = [
    [2097150, "0xb1a4ca4945897afc88667806b7e33087184a3ea11fb368bb55e217b57b0b4c15"],
    [2621437, "0xf36d5add674602d7042f61452aae1e41ad240a299e604820ad8b59a3e3c90286"],
    [2752508, "0xe81e96b7ad56d9e4291ced80dc6aa266e67cf4a019a862fd5ec135ca56a6d261"],
    [2785275, "0x15d17ccd65c117dc91d121883f7a952a6e31e6a19356c4ba1cbac19b40ba2b84"],
    [2787322, "0x577acd6770e5e83d137b798dd80543b0cb26167000f1ddffa80896b496312c26"],
    [2787833, "0x6bfd4d14cb36af6a9adefa32a9aaee26a6d05a69b708cd632cc9833e5d5b57e0"],
    [2787960, "0x99d597140a1804b6afccc44ec974cad584f1b93dc8765ea5744c3bf39c34812e"],
    [2787991, "0xb0f7776974e0129d18ca194744eee971a589a619a8e20db07f2b43ccbca7a955"],
    [2787992, "0xef791e4887ef328df6f352e19ad3a11f5c4cb6d6ea73e361cdff222d1cec865c"]
  ];

  private beginBlock = 1394001;

  static async ensureNode(id: string): Promise<void> {
    const block = await NodeEntity.get(id);

    if (!block) {
      await new NodeEntity(id).save();
    }
  }

  constructor(block: SubstrateBlock) {
    this.block = block;
  }

  get number() {
    return this.block.block.header.number.toBigInt() || BigInt(0);
  }

  get hash() {
    return this.block.block.hash.toString();
  }

  public async save() {
    if (this.number < this.beginBlock) {
      return;
    }

    if (this.number === BigInt(this.beginBlock)) {
      this.init();
    }

    const block_position = leaf_index_to_pos(this.block.block.header.number.toNumber());
    const record = new NodeEntity(block_position.toString());

    record.position = block_position;
    record.hash = this.hash;

    await record.save();

    await this.checkPeaks(block_position);
  }

  private async checkPeaks(block_position: number) {
    let height = 0;
    let pos = block_position;

    while (pos_height_in_tree(pos + 1) > height) {
      pos += 1;

      const left_pos = pos - parent_offset(height);
      const right_pos = left_pos + sibling_offset(height);

      const left_elem = await NodeEntity.get(left_pos.toString());
      const right_elem = await NodeEntity.get(right_pos.toString());

      const record = new NodeEntity(pos.toString());

      record.position = pos;
      record.hash = merge(left_elem.hash, right_elem.hash);

      await record.save();

      height += 1;
    }
  }

  private async init() {
    const nodes = this.peaks.map(([pos, hash]) => {
      const record = new NodeEntity(pos.toString());
      
      record.position = pos;
      record.hash = hash;

      return record.save();
    });

    await Promise.all(nodes);
  }
}

/* ---------------------------------------helper fns-------------------------------------- */

// https://github.com/darwinia-network/darwinia-common/blob/dd290ffba475cf80bca06ac952fb2f29d3658560/frame/header-mmr/src/primitives.rs#L19-L21
function merge(left: string, right: string): string {
  const res = new Tuple(
    registry,
    [Raw, Raw],
    [new Raw(registry, hexToU8a(left)), new Raw(registry, hexToU8a(right))],
  );

  return blake2AsHex(res.toU8a());
}

function leaf_index_to_pos(index: number): number {
  // mmr_size - H - 1, H is the height(intervals) of last peak
  return leaf_index_to_mmr_size(index) - trailing_zeros(index + 1) - 1;
}

function leaf_index_to_mmr_size(index: number): number {
  // leaf index start with 0
  const leaves_count = index + 1;

  // the peak count(k) is actually the count of 1 in leaves count's binary representation
  const peak_count = count(leaves_count, "1");

  return 2 * leaves_count - peak_count;
}

function dec2bin(dec: number): string {
  return (dec >>> 0).toString(2).padStart(64, "0");
}

function count(dec: number, target: "0" | "1") {
  const binary = dec2bin(dec);
  let count: number = 0;

  for (let i = 0; i < binary.length; i++) {
    if (binary.charAt(i) === target) {
      count += 1;
    }
  }

  return count;
}

function trailing_zeros(dec: number): number {
  const binary = dec2bin(dec);
  let count: number = 0;

  for (let i = binary.length - 1; i >= 0; i--) {
    if (binary.charAt(i) === "0") {
      count += 1;
    } else {
      break;
    }
  }

  return count;
}

function leading_zeros(dec: number): number {
  const binary = dec2bin(dec);
  let count: number = 0;

  for (let i = 0; i < binary.length; i++) {
    if (binary.charAt(i) === "0") {
      count += 1;
    } else {
      break;
    }
  }

  return count;
}

function all_ones(dec: number): boolean {
  return dec != 0 && count(dec, "0") === leading_zeros(dec);
}

function jump_left(pos: number): number {
  const bit_length = 64 - leading_zeros(pos);
  const most_significant_bits = 1 << (bit_length - 1);

  return pos - (most_significant_bits - 1);
}

function pos_height_in_tree(pos: number): number {
  pos += 1;

  while (!all_ones(pos)) {
    pos = jump_left(pos);
  }

  return 64 - leading_zeros(pos) - 1;
}

function parent_offset(height: number): number {
  return 2 << height;
}

function sibling_offset(height: number): number {
  return (2 << height) - 1;
}
