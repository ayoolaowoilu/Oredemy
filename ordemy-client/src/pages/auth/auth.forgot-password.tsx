import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { isValidEmail } from "./auth.helpers";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!isValidEmail(email)) return setError("Enter a valid email address.");

    setSubmitting(true);
    try {
      // TODO: call the password-reset endpoint once the API supports it
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-muted/40 lg:flex-row">
      {/* Brand panel: logo + illustration on the left */}
      <aside className="hidden flex-col items-center justify-center gap-4 p-10 lg:w-1/2 lg:flex lg:items-between lg:pl-8">
        <div className="flex w-full max-w-md items-center justify-center">
          <img
            src="/ordemylogo.svg"
            alt="Oredemy"
            className="w-[60%] object-contain"
          />
        </div>
        <h4 className="max-w-md text-center text-lg font-bold tracking-tight text-[#2567EB]">
          Bridging the gap between students and advisers.
        </h4>
      </aside>

      {/* Form panel on the right */}
      <div className="flex flex-1 items-center justify-center ml-20 px-4 py-10 lg:justify-between lg:pr-4">
        <div className="w-full max-w-lg">
          {/* Small logo shown only when the brand panel is hidden */}
          <Link
            to="/"
            className="mb-6 flex items-center justify-center lg:hidden"
          >
            <img
              src="/ordemylogo.svg"
              alt="Oredemy"
              className="h-7 w-auto"
            />
          </Link>

          <Card className="w-full border-0 shadow-none rounded-none bg-card-none">
            <CardHeader className="space-y-1">
              <CardTitle className="font-bold">Forgot Password?</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter your email and we&rsquo;ll send you a link to reset your
                password.
              </p>
            </CardHeader>

            <CardContent>
              {sent ? (
                <div className="space-y-4">
                  <p className="text-sm text-foreground">
                    If an account exists for <b>{email}</b>, a password reset
                    link has been sent. Check your inbox and spam folder.
                  </p>
                  <Link
                    to="/login"
                    className="font-medium w-full text-center p-4 block rounded-2xl bg-[#E9E5FF] text-[#2501FF] hover:bg-[#2501FF] hover:text-white"
                  >
                    Back to sign in
                  </Link>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  autoComplete="off"
                  className="space-y-5"
                >
                  <Input
                    id="email"
                    type="email"
                    autoComplete="off"
                    placeholder="Email"
                    className="h-auto p-4 rounded-2xl hover:border-[#2501FF] focus-visible:border-[#2501FF] focus-visible:ring-[#2501FF]/25"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-2xl bg-[#2501FF] text-white hover:bg-[#2501FF] hover:text-white"
                    disabled={submitting}
                  >
                    {submitting ? "Sending…" : "Send reset link"}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="justify-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link to="/login" className="ml-1 font-medium text-[#2501FF]">
                Sign in
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
