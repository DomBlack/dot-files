{ stdenv, buildGoPackage, fetchFromGitHub }:
buildGoPackage rec {
  name = "yubikey-touch-detector-${version}";
  version = "1.7.0";
  rev = "bb5c86ed2fd15452565bf1c16872ec056ee012fc";

  goPackagePath = "github.com/maximbaz/yubikey-touch-detector";

  src = fetchFromGitHub {
    owner = "maximbaz";
    repo = "yubikey-touch-detector";
    rev = version;
    sha256 = "1qcw4hmdwlyd9vay23j3wvnzchrwsjd4lgh0am6bak5gqrddn2a2";
  };

  goDeps = ./deps.nix;

  meta = {
    description = "Detects when your YubiKey is waiting for a touch";
    license = stdenv.lib.licenses.mit;
    homepage = https://github.com/maximbaz/yubikey-touch-detector;
  };
}