'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '../components/shadcn/button';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/shadcn/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '../components/shadcn/field';
import { Input } from '../components/shadcn/input';
import { signIn as login } from '../lib/auth/auth-client';
import { cn } from '../utils/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    handleSubmit,
    control,
    setValues,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  function fillCredentials() {
    setValues({
      email: 'test@test.com',
      password: 'Test1234',
    });
  }

  async function onSubmit(values: LoginFormValues) {
    await login.email(
      {
        email: values.email,
        password: values.password,
        callbackURL: '/', // BetterAuth handles the routing session on verification
      },
      {
        onRequest: () => {
          setIsLoading(true);
        },
        onSuccess: () => {
          setIsLoading(false);
        },
        onError: (ctx) => {
          setIsLoading(false);
          // Gracefully pipe server-side errors (e.g. "Invalid email or password") into the layout
          setError('root', { message: ctx.error.message });
        },
      },
    );
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>

              {/* Email Input Field */}
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex flex-row w-max justify-between">
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Button variant="link" onClick={fillCredentials}>Fill credentials</Button>
                    </div>
                    <Input
                      {...field}
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      disabled={isLoading}
                    />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              {/* Password Input Field */}
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex items-center">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <a
                        href="/forgot-password"
                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                      >
                        Forgot your password?
                      </a>
                    </div>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      disabled={isLoading}
                    />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              {/* Submission and Alternative Actions */}
              <Field>
                {/* BetterAuth server validation error display */}
                {errors.root && (
                  <p className="text-xs font-medium text-destructive dark:text-red-400 mb-2 text-center">
                    {errors.root.message}
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>

                  <Button variant="outline" type="button" className="w-full" disabled={isLoading}>
                    Login with Google
                  </Button>
                </div>

                <FieldDescription className="text-center mt-4">
                  Don&apos;t have an account?
                  {' '}
                  <a href="/register" className="underline underline-offset-4 hover:text-primary">
                    Sign up
                  </a>
                </FieldDescription>
              </Field>

            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
