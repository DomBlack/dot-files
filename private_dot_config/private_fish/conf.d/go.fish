# Go configuration
set -gx GOPATH $HOME
set -gx CGO_ENABLED 0
set -gx GOPRIVATE (string join "," \
    "github.com/avianlabs/backend/*" \
)

# Build flags for faster compilation
# -gcflags="all=-N -l": Disable optimizations (-N) and inlining (-l) for faster builds
# -trimpath: Remove local file paths from binaries for reproducible builds
set -gx GOFLAGS "-gcflags=all=-N -gcflags=all=-l -trimpath"

# Generate code optimized for Apple Silicon M3 (ARMv8.6-A architecture)
# v8.6 enables LSE atomics, SHA-512, SVE hints, BFloat16, and more
# ,crypto enables hardware AES + SHA-256 acceleration
# See: https://go.dev/wiki/MinimumRequirements#arm64
set -gx GOARM64 "v8.6,crypto"

# Add Go binaries to path
fish_add_path $GOPATH/bin

