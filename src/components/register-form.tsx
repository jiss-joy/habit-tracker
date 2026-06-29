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
import { signUp } from '../lib/auth/auth-client'; // 👈 Adjust this path to your BetterAuth client setup

// 📝 Define strict client-side validation schema
const registerSchema = z.object({
  name: z.string().min(1, 'Full name is required').trim(),
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'], // Highlights the confirm password field on mismatch
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(values: RegisterFormValues) {
    await signUp.email(
      {
        email: values.email,
        password: values.password,
        name: values.name,
        callbackURL: '/dashboard', // BetterAuth auto-redirects here on success
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
          // Set a root-level error to display within the form instead of a dirty window alert
          setError('root', { message: ctx.error.message });
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card {...props}>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Enter your information below to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              {/* Full Name Field */}
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="name">Full Name</FieldLabel>
                    <Input {...field} id="name" type="text" placeholder="John Doe" disabled={isLoading} />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              {/* Email Field */}
              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input {...field} id="email" type="email" placeholder="m@example.com" disabled={isLoading} />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              {/* Password Field */}
              <Controller
                name="password"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input {...field} id="password" type="password" disabled={isLoading} />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              {/* Confirm Password Field */}
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                    <Input {...field} id="confirm-password" type="password" disabled={isLoading} />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />

              {/* Action and Navigation Section */}
              <FieldGroup>
                <Field>
                  {/* BetterAuth server validation error display */}
                  {errors.root && (
                    <p className="text-xs font-medium text-destructive dark:text-red-400 mb-2 text-center">
                      {errors.root.message}
                    </p>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>

                  <FieldDescription className="px-6 text-center mt-2">
                    Already have an account?
                    {' '}
                    <a href="/login" className="underline underline-offset-4 hover:text-primary">Sign in</a>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <FieldDescription className="px-6 text-center">
        By clicking continue, you agree to our
        {' '}
        <a href="#" className="underline underline-offset-4">Terms of Service</a>
        {' '}
        and
        {' '}
        <a href="#" className="underline underline-offset-4">Privacy Policy</a>
        .
      </FieldDescription>
    </div>
  );
}
