function fileSetter(
  event: React.ChangeEvent<HTMLInputElement>,
  setter: (file: File | null) => void,
) {
  const file = event.target.files?.[0];
  setter(file || null);
}

export { fileSetter };
