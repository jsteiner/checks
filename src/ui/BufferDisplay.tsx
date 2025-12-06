import { Text } from "ink";

interface BufferDisplayProps {
  buffer: string;
}

export function BufferDisplay({ buffer }: BufferDisplayProps) {
  return (
    <>
      <Text bold>Input: </Text>
      <Text>{buffer}</Text>
    </>
  );
}
