# Awesome programming specific font
# Purchasable from: https://www.fsd.it/
{ runCommand, requireFile, unzip }:
let
  name = "pragmatapro-${version}";
  version = "0.828-2";
in

runCommand name
  rec {
    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    outputHash     = "0lb6w3giyh794bag5vhjgnpxpb5lmpff6bj2znn4da79s1wbfzl7";

    src = requireFile rec {
      name   = "PragmataPro-Regular${version}.zip";
      url    = "file://path/to/${name}";
      sha256 = "b213de026859362e2ba7e04f5a3d62f7809411b4e9b888dcf202444c72b86982";
    };

    buildInputs = [ unzip ];
  } ''
    unzip $src

    install_path=$out/share/fonts/truetype/pragmatapro
    mkdir -p $install_path

    find -name "PragmataPro*.ttf" -exec mv {} $install_path \;
  ''