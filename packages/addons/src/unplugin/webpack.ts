import {PluginOptions} from "./types";
import {TreeshakeServerComposables} from "./TreeshakeServerComposables";

export default (args: PluginOptions = {}) => {
  return [
    TreeshakeServerComposables.webpack(args),
  ]
}
