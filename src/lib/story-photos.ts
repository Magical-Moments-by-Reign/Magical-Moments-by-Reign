// Real photography used behind specific occasion cards ("Choose your
// story" on the home page and "Choose your occasion" on /create).
// Cards without an entry fall back to their gradient.
export const STORY_PHOTOS: Record<string, string> = {
  wedding: "/story/wedding.jpg",
  baby: "/story/baby.jpg",
  birthday: "/story/birthday.jpg",
  // Backgrounds for the previously-empty occasion tiles, using approved in-repo
  // imagery (reused, originals unaltered). Graduation still needs its own photo.
  anniversary: "/gallery/smith/07-sunset.jpg",
  proposal: "/gallery/smith/09-rings.jpg",
  vacation: "/hero/italy-poster.jpg",
  newhome: "/gallery/johnson/our-new-home.jpg",
  military: "/story/military.jpg",
  reunion: "/story/reunion.jpg",
  retirement: "/story/retirement.jpg",
  memorial: "/story/memorial.jpg",
  sweet16: "/story/sweet16.jpg",
  firstbirthday: "/story/firstbirthday.jpg",
  quinceanera: "/story/quinceanera.jpg",
  sports: "/story/sports.jpg",
  prom: "/story/prom.jpg",
  bridalshower: "/story/bridalshower.jpg",
  babyshower: "/story/babyshower.jpg",
  genderreveal: "/story/genderreveal.jpg",
};
