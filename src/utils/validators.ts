import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(6, 'Password must be at least 6 characters.'),
});

export const registerSchema = z
  .object({
    displayName: z
      .string({ required_error: 'Full name is required.' })
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(50, 'Name is too long.'),
    email: z
      .string({ required_error: 'Email is required.' })
      .trim()
      .min(1, 'Email is required.')
      .email('Enter a valid email address.'),
    password: z
      .string({ required_error: 'Password is required.' })
      .min(6, 'Password must be at least 6 characters.')
      .max(128, 'Password is too long.'),
    confirmPassword: z.string({ required_error: 'Please confirm your password.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .trim()
    .min(1, 'Email is required.')
    .email('Enter a valid email address.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
