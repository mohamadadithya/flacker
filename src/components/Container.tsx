import { cn } from "../helpers";

export default function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`container mx-auto ${cn("px-5", className)}`}>
      {children}
    </div>
  );
}
