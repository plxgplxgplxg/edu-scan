from __future__ import annotations

from pathlib import Path
import subprocess
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
PROTO_PATH = ROOT_DIR / "proto" / "omr_service.proto"
GENERATED_DIR = ROOT_DIR / "app" / "grpc" / "generated"
BACKEND_PROTO_PATH = (
    ROOT_DIR.parent
    / "backend-nestjs"
    / "src"
    / "modules"
    / "omr"
    / "proto"
    / "omr_service.proto"
)


def ensure_python_package(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    init_file = path / "__init__.py"
    if not init_file.exists():
        init_file.write_text("# Generated protobuf modules.\n", encoding="utf-8")


def generate_stubs() -> None:
    ensure_python_package(GENERATED_DIR)
    command = [
        sys.executable,
        "-m",
        "grpc_tools.protoc",
        f"-I{PROTO_PATH.parent}",
        f"--python_out={GENERATED_DIR}",
        f"--grpc_python_out={GENERATED_DIR}",
        str(PROTO_PATH),
    ]
    subprocess.run(command, check=True, cwd=ROOT_DIR)
    grpc_module_path = GENERATED_DIR / "omr_service_pb2_grpc.py"
    grpc_module_path.write_text(
        grpc_module_path.read_text(encoding="utf-8").replace(
            "import omr_service_pb2 as omr__service__pb2",
            "from . import omr_service_pb2 as omr__service__pb2",
        ),
        encoding="utf-8",
    )


def sync_backend_proto() -> None:
    BACKEND_PROTO_PATH.parent.mkdir(parents=True, exist_ok=True)
    BACKEND_PROTO_PATH.write_text(PROTO_PATH.read_text(encoding="utf-8"), encoding="utf-8")


def main() -> None:
    generate_stubs()
    sync_backend_proto()


if __name__ == "__main__":
    main()
