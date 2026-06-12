interface CountryFlagProps {
  code: string
  size?: number
}

export function CountryFlag({ code, size = 20 }: CountryFlagProps) {
  return (
    <img
      src={`https://flagcdn.com/${size}x${Math.round(size * 0.75)}/${code.toLowerCase()}.png`}
      alt={code}
      title={code}
      width={size}
      height={Math.round(size * 0.75)}
      className="inline-block rounded-sm"
    />
  )
}
