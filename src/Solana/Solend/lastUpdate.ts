import * as Layout from "./layout";
import * as BufferLayout from "buffer-layout";

export const LastUpdateLayout = BufferLayout.struct(
  [Layout.uint64("slot"), BufferLayout.u8("stale")],
  "lastUpdate"
);