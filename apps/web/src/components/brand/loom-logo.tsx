import Image from "next/image";

export function LoomLogo({
  size = "default",
}: {
  size?: "small" | "default" | "large";
}) {
  const config = {
    small: {
      width: 120,
      height: 44,
      className: "h-9 w-auto",
    },
    default: {
      width: 160,
      height: 58,
      className: "h-12 w-auto",
    },
    large: {
      width: 220,
      height: 80,
      className: "h-16 w-auto",
    },
  }[size];

  return (
    <Image
      src="/brand/loom-logo-transparent.png"
      alt="Loom"
      width={config.width}
      height={config.height}
      priority
      className={`${config.className} object-contain`}
    />
  );
}