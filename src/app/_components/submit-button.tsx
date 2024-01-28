type SubmitButtonProps = {
  isLoading: boolean;
};

export function SubmitButton({ isLoading }: SubmitButtonProps) {
  return (
    <button type="submit" disabled={isLoading}>
      {isLoading ? "Loading..." : "Submit"}
    </button>
  );
}
