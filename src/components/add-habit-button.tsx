'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { HabitFrequencies } from '../db/enums/habit-frequency';
import { HabitType } from '../db/enums/habit-type';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/shadcn/dialog";
import { Button } from "../components/shadcn/button";
import { Input } from "../components/shadcn/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/shadcn/select";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../components/shadcn/field"
import { useUuid } from '../hooks/use-uuid';
import { useDexieDb } from '../contexts/dexie-provider';
import { SyncStatus } from '../db/enums/sync-status';

// 💡 Define strict validation schema matching your layout requirements
const habitFormSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(HabitType.BINARY),
    name: z.string().min(1, 'Habit name is required'),
    description: z.string().optional(),
    frequency: z.nativeEnum(HabitFrequencies),
  }),
  z.object({
    type: z.literal(HabitType.MEASURABLE),
    name: z.string().min(1, 'Habit name is required'),
    description: z.string().optional(),
    frequency: z.nativeEnum(HabitFrequencies),
    targetValue: z.string().optional(),
    unit: z.string().optional(),
  }).refine((data) => {
    // 💡 Custom logical refinement matching your conditions
    if (data.type === HabitType.MEASURABLE) {
      return !!data.targetValue && Number(data.targetValue) >= 1 && !!data.unit;
    }
    return true;
  }, {
    message: "Target goal and unit are required for measurable habits",
    path: ["targetValue"] // Highlights the target field if validation fails
  }),
]);

type HabitFormValues = z.infer<typeof habitFormSchema>;

export function AddHabitDialog() {
  const [open, setOpen] = useState(false);
  const getUuid = useUuid()
  const db = useDexieDb(); 

  // 💡 Initialize react-hook-form with Zod validation resolver
  const {
    handleSubmit,
    watch,
    reset,
    control,
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: HabitType.BINARY,
      frequency: HabitFrequencies.DAILY,
    },
  });

  // Watch the type field to conditionally render target/unit fields safely
  const selectedType = watch('type');

  async function onSubmit(data: HabitFormValues) {
    const timestamp = new Date().getTime();
    const habitName = data.name.trim();
    const habitSlug = `USER_ID_${habitName}_${timestamp}`;
    const habitUuid = getUuid(habitSlug);

    await db.habits.add({
      id: habitUuid,
      userId: '00000000-0000-0000-0000-000000000000',
      name: habitName,
      description: data.description || null,
      type: data.type,
      frequency: data.frequency,
      targetValue: data.type === HabitType.MEASURABLE ? Number(data.targetValue) : null,
      unit: data.type === HabitType.MEASURABLE ? (data.unit ?? null) : null,
      isDeleted: 0,
      syncStatus: SyncStatus.MODIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="default">+ Add Habit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Habit</DialogTitle>
        </DialogHeader>

        <form id="add-habit" onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({field, fieldState})=>(
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Habit Name</FieldLabel>
                  <Input {...field} id="name" placeholder="Exercise, Meditate..." />
                  {fieldState.error && <FieldError>Required field</FieldError>}
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup>
            <Controller
              name="description"
              control={control}
              render={({field, fieldState})=>(
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Description</FieldLabel>
                  <Input {...field} id="description" placeholder="Optional details..." />
                  {fieldState.error && <FieldError>Required field</FieldError>}
                </Field>
              )}
            />
          </FieldGroup>

          <FieldGroup className='flex flex-row'>
            <Controller
              name="type"
              control={control}
              render={({field, fieldState})=>(
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Type</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={HabitType.BINARY}>Binary (Yes/No)</SelectItem>
                      <SelectItem value={HabitType.MEASURABLE}>Measurable</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && <FieldError>Required field</FieldError>}
                </Field>
              )}
            />
            <Controller
              name="frequency"
              control={control}
              render={({field, fieldState})=>(
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Frequency</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={HabitFrequencies.DAILY}>Daily</SelectItem>
                      <SelectItem value={HabitFrequencies.WEEKLY}>Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.error && <FieldError>Required field</FieldError>}
                </Field>
              )}
            />
          </FieldGroup>

          {selectedType === HabitType.MEASURABLE && (
            <FieldGroup className="grid grid-cols-2 gap-4 border-t pt-3 border-dashed border-zinc-200 dark:border-zinc-800">
              <Controller
                name="targetValue"
                control={control}
                render={({field, fieldState})=>(
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Target Goal</FieldLabel>
                    <Input {...field} id="targetValue" type="number" placeholder="20, 500..." />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />
              <Controller
                name="unit"
                control={control}
                render={({field, fieldState})=>(
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Unit</FieldLabel>
                    <Input {...field} id="unit" placeholder="pages, ml..." />
                    {fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
                  </Field>
                )}
              />
            </FieldGroup>
          )}

          <Button type="submit" className="w-full mt-2">Save Habit</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}