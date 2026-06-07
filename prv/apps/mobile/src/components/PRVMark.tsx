import Svg, { Path } from "react-native-svg"

interface PRVMarkProps {
  size?: number
  color?: string
}

export function PRVMark({ size = 32, color = "#ffffff" }: PRVMarkProps) {
  return (
    <Svg width={Math.round(size * 0.65)} height={size} viewBox="0 0 52 80" fill={color}>
      <Path
        fillRule="evenodd"
        d="M0 0H36Q52 0 52 23Q52 46 36 46H18V80H0Z M18 12H32Q42 12 42 23Q42 34 32 34H18Z M18 12H30V24H18Z"
      />
    </Svg>
  )
}
