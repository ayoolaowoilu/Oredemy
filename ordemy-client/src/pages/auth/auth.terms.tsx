import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

export default function Terms() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-lg">
        <Link
          to="/register"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#2501FF]"
        >
          <ArrowLeft className="size-4" />
          Back to sign up
        </Link>

        <Card className="w-full border-0 shadow-none rounded-none bg-card-none">
          <CardHeader>
            <CardTitle className="font-bold">Terms and Privacy Policy</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              This is a placeholder for your Terms and Privacy Policy
              document. Replace this content with the full text of your
              terms of service and privacy policy.
            </p>
            <p>
              By creating an account with Oredemy, you agree to these terms.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
