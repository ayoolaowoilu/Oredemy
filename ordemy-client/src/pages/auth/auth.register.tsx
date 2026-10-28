import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { ApiError } from "../../lib/api";
import { isValidEmail, isValidPassword } from "./auth.helpers";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "lecturer">("student");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (trimmedName.length < 3 || trimmedName.length > 255)
      return setError("Name must be between 3 and 255 characters.");
    if (!isValidEmail(email)) return setError("Enter a valid email address.");
    if (!isValidPassword(password))
      return setError(
        "Password must be at least 6 characters with a letter and a number.",
      );
    if (!agreed)
      return setError("You must agree to the terms and privacy policy.");

    setSubmitting(true);
    try {
      await register({
        name: trimmedName,
        email,
        password,
        role,
      });
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
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
              <CardTitle className="font-bold">Create an account</CardTitle>
              <div className="flex flex-rol gap-3 mt-2">
                {(
                  [
                    ["student", "Student"],
                    ["lecturer", "Adviser"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    variant={role === value ? "default" : "outline"}
                    className={
                      role === value
                        ? "rounded-xl bg-[#2501FF] text-white"
                        : "rounded-xl bg-[#E9E5FF] text-[#2501FF] hover:bg-[#2501FF] hover:text-white"
                    }
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
                <div className="space-y-2">
                  <Input
                    id="name"
                    autoComplete="off"
                    placeholder="Full name"
                    className="h-auto p-4 rounded-2xl hover:border-[#2501FF] focus-visible:border-[#2501FF] focus-visible:ring-[#2501FF]/25"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
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
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Password"
                      className="h-auto p-4 pr-10 rounded-2xl hover:border-[#2501FF] focus-visible:border-[#2501FF] focus-visible:ring-[#2501FF]/25"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute top-0 right-0 h-10 w-10 mt-2 text-muted-foreground hover:bg-transparent"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Adviser accounts are checked and approved by your school admin before you get access.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer text-black">
                    <span className="relative flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(event) => setAgreed(event.target.checked)}
                        className="appearance-none size-4 rounded-sm border-2 border-[#2501FF] bg-white checked:bg-[#2501FF] cursor-pointer"
                      />
                      <Check
                        className={`absolute size-3 text-white pointer-events-none transition-opacity ${
                          agreed ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </span>
                    I agree to the terms and privacy
                  </label>

                  <Link
                    to="/terms"
                    className="text-xs text-[#2501ff] font-bold"
                  >
                    Read the Terms and Privacy Policy
                  </Link>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full h-12 rounded-2xl bg-[#2501FF] text-white hover:bg-[#2501FF] hover:text-white" disabled={submitting}>
                  {submitting ? "Creating account…" : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 flex flex-col gap-3 items-center text-sm text-muted-foreground">
                <span>Already have an account?</span>
                <Link
                  to="/login"
                  className="font-medium w-full text-center p-4 rounded-2xl bg-[#E9E5FF] text-[#2501FF] hover:bg-[#2501FF] hover:text-white"
                >
                  Sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
