import type { ReactNode } from "react";
import {
  Card,
  EmptyState,
  Notice,
  OutlineButton,
  PageIntro,
  PrimaryButton,
  StatCard,
} from "../../components/dashboard-ui";

export function AdviserPageIntro(props: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return <PageIntro {...props} />;
}

export function AdviserCard({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <Card className={className} padded={padded}>
      {children}
    </Card>
  );
}

export function AdviserNotice({
  children,
  tone = "error",
  dismiss,
}: {
  children: ReactNode;
  tone?: "error" | "success" | "warning";
  dismiss?: () => void;
}) {
  return (
    <Notice tone={tone} onDismiss={dismiss}>
      {children}
    </Notice>
  );
}

export const AdviserEmpty = EmptyState;
export const AdviserOutlineButton = OutlineButton;
export const AdviserPrimaryButton = PrimaryButton;
export const AdviserStatCard = StatCard;
