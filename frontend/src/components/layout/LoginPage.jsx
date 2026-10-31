import { useState } from "react";
import { useLoginContext } from "@/hooks/useLoginContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login, loading, error } = useLoginContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    await login(email, password);
  };

  return (
    <div
      data-testid="login-page"
      className="min-h-screen flex items-center justify-center bg-background p-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-1">
          <div className="mx-auto mb-2 h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
            <Package className="h-5 w-5 text-primary-foreground" />
          </div>
          <CardTitle className="text-lg">Central Inventory</CardTitle>
          <CardDescription className="text-xs">
            Sign in with your MyGenie vendor account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div
                data-testid="login-error"
                className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              data-testid="login-submit-button"
              type="submit"
              className="w-full"
              disabled={loading || !email || !password}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground text-center mt-4">
            Central Inventory — MyGenie
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
