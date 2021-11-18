import { SubstrateBlock } from "@subql/types";
import { BlockHandler } from "../handlers/block";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  const handler = new BlockHandler(block);

  await handler.save();
}
