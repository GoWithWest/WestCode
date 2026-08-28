import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-opacity duration-(--motion-quick) ease-(--ease-out) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:opacity-90",
        ghost: "text-foreground hover:bg-muted/60",
        outline: "border border-border bg-transparent hover:bg-muted/50",
        subtle: "bg-muted text-foreground hover:bg-muted/80",
        danger: "bg-danger text-danger-foreground hover:opacity-90",
      },
      size: {
        default: "h-9 rounded-md px-3 text-sm",
        sm: "h-7 rounded-sm px-2.5 text-xs",
        lg: "h-11 rounded-md px-4 text-sm",
        icon: "size-8 rounded-sm",
        pill: "h-7 rounded-full px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
