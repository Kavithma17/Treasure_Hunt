// Two-word key generator with large combo space
const adjectives = [
  'MIGHTY','SNEAKY','COSMIC','FIZZY','JOLLY','SPICY','BOLD','RAPID','CRUNCHY','CURIOUS','WACKY','ZIPPY',
  'BRAVE','LUCKY','SUNNY','CHILLY','DREAMY','EPIC','FANCY','GLIMMERING','HAPPY','ICY','JAZZY','LUMINOUS',
  'MAGNETIC','NIMBLE','ODD','PEPPY','QUICK','RADIANT','SILLY','TWINKLY','VIVID','WHISPERING','ZANY','ZESTY',
  'GLEEFUL','SASSY','SNAPPY','SUGARY','TASTY','TINY','GIANT','GENTLE','ROWDY','CHEERFUL','WILD','QUIRKY',
  'SPARKLY','BREEZY','BUBBLY','CHIRPY','CLOUDED','DAZZLING','DARING','FEISTY','GRACEFUL','MERRY','PLUCKY','SMOOTH'
];

const nouns = [
  // Fruits
  'MANGO','BANANA','PINEAPPLE','APPLE','ORANGE','GRAPE','BERRY','PEACH','PEAR','KIWI','LEMON','LIME','CHERRY','COCONUT',
  'PAPAYA','GUAVA','FIG','APRICOT','AVOCADO','TANGERINE','MELON','WATERMELON','PLUM','POMEGRANATE','BLUEBERRY','STRAWBERRY',
  'BLACKBERRY','RASPBERRY','DRAGONFRUIT','CANTALOUPE','HONEYDEW','CRANBERRY',
  // Animals
  'PANDA','KOALA','DRAGON','OTTER','LION','TIGER','BEAR','EAGLE','HAWK','FOX','WOLF','WHALE','DOLPHIN','SHARK','TURTLE',
  'FALCON','OWL','PENGUIN','SEAL','GIRAFFE','ZEBRA','RHINO','HIPPO','CAMEL','LLAMA','ALPACA','MONKEY','SLOTH','RABBIT',
  'FROG','TOAD','CRAB','SQUID','OCTOPUS','BEE','ANT','SPIDER','BUTTERFLY','FIREFLY','KANGAROO','BUFFALO','CHEETAH','JAGUAR',
  // Fun foods & objects
  'PUMPKIN','TACO','COOKIE','DONUT','PANCAKE','WAFFLE','CUPCAKE','NOODLE','PASTA','BURGER','SUSHI','RAMEN','PIZZA','MUFFIN',
  'BROWNIE','PRETZEL','NACHO','CANDY','MARSHMALLOW','POPCORN','CHOCOLATE',
  'ROCKET','ROBOT','LASER','COMET','PLANET','STAR','MOON','SUN','CLOUD','RAINBOW','THUNDER','VOLCANO','MOUNTAIN','RIVER',
  'OCEAN','SEASHELL','TREASURE','BEACON','MAP','COMPASS','LANTERN','GADGET','MAGNET','CRYSTAL','GEM','PEBBLE','ACORN'
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export async function generateTwoWordKey(isTaken) {
  // Try up to several thousand random picks before falling back to full sweep
  const maxRand = Math.min(adjectives.length * nouns.length, 5000);
  for (let i = 0; i < maxRand; i++) {
    const candidate = `${pick(adjectives)}-${pick(nouns)}`;
    // Ensure strictly two words
    if (!(await isTaken(candidate))) return candidate;
  }
  // Deterministic sweep
  for (let i = 0; i < adjectives.length; i++) {
    for (let j = 0; j < nouns.length; j++) {
      const candidate = `${adjectives[i]}-${nouns[j]}`;
      if (!(await isTaken(candidate))) return candidate;
    }
  }
  // If full space saturated, just return a random one (practically unreachable)
  return `${pick(adjectives)}-${pick(nouns)}`;
}
