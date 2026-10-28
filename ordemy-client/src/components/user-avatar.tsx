interface UserAvatarProps {
  image?: string | null;
  name?: string | null;
  className: string;
}

export function UserAvatar({ image, name, className }: UserAvatarProps) {
  if (image) {
    return <img src={image} alt={name ? `${name} profile` : ""} className={`${className} rounded-full object-cover`} />;
  }
  return (
    <span className={`${className} grid place-items-center rounded-full bg-[#2501FF]/10 font-bold text-[#2501FF]`}>
      {name?.trim().charAt(0).toUpperCase() || "U"}
    </span>
  );
}
