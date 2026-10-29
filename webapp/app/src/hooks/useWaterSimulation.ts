import useSimulatedReading from './useSimulatedReading';

export default function useWaterSimulation() {
  const { value, time, moving } = useSimulatedReading({ initial: 78, minimum: 20, maximum: 80 });
  return { level: value, time, moving };
}
