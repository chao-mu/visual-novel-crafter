"use client";

// react-hook-form
import {
  useForm,
  useFieldArray,
  UseFormRegister,
  Control,
} from "react-hook-form";

// NextJs
import { useRouter } from "next/navigation";

// Ours
import { api } from "@/trpc/react";
import formStyles from "@/styles/form.module.css";
import { SubmitButton } from "@/app/_components/submit-button";

type MenuFormProps = {
  timelineId: number;
  order: number;
};

type MenuFormValues = {
  menuItems: {
    text: string;
  }[];
};

type MenuItemsFieldsProps = {
  control: Control<MenuFormValues, any>;
  register: UseFormRegister<MenuFormValues>;
};

function MenuItemsFields({ control, register }: MenuItemsFieldsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "menuItems",
  });

  const addItem = () => {
    append({ text: "" });
  };

  const addOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div>
      {fields.map((item, index) => (
        <div key={item.id}>
          <input
            {...register(`menuItems.${index}.text`)}
            onKeyDown={addOnEnter}
          />
          <button type="button" onClick={() => remove(index)}>
            Delete
          </button>
        </div>
      ))}
      <button type="button" onClick={() => addItem()}>
        Add
      </button>
    </div>
  );
}

export function MenuForm({ timelineId, order }: MenuFormProps) {
  const router = useRouter();
  const { register, reset, handleSubmit, control } = useForm<MenuFormValues>({
    defaultValues: {
      menuItems: [{ text: "" }],
    },
  });

  const onSuccess = () => {
    reset();
    router.refresh();
  };

  const addMenu = api.timeline.addMenu.useMutation({ onSuccess });

  const onSubmit = handleSubmit(({ menuItems, ...data }, e) => {
    e?.preventDefault();
    addMenu.mutate({
      ...data,
      menuItems: menuItems
        .map((item) => ({
          ...item,
          text: item.text.trim(),
        }))
        .filter((item) => item.text),
      order,
      timelineId,
    });
  });

  return (
    <form onSubmit={onSubmit} className={formStyles.form}>
      <MenuItemsFields control={control} register={register} />
      <SubmitButton isLoading={false} />
      <p className={formStyles["submission-error"]}>{addMenu.error?.message}</p>
    </form>
  );
}
