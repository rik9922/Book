import crypto from "node:crypto";

export interface SyntheticPerson {
  id: string;
  name: string;
  role: "owner" | "editor" | "contributor" | "viewer";
  relationship: string;
  birthYear: number;
  email: string;
}

export interface SyntheticMemoryData {
  id: string;
  spaceId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  format: "story" | "photo" | "video" | "voice_note" | "document";
  capturedAt: string;
  location: string;
  latitude: number;
  longitude: number;
  isFavorite: boolean;
  associatedPeople: string[];
  tags: string[];
  scenario: "family_gathering" | "travel_expedition" | "personal_milestone" | "daily_lifestyle";
  mediaFilenames: string[];
}

export interface SyntheticFamilyWorkspace {
  id: string;
  name: string;
  description: string;
  motto: string;
  members: SyntheticPerson[];
  memories: SyntheticMemoryData[];
}

export function generateBennettFamilyWorkspace(): SyntheticFamilyWorkspace {
  const spaceId = "e8cf4fc3-137e-4397-883d-21cd6a7cb61f"; // Consistent deterministic space UUID

  const members: SyntheticPerson[] = [
    {
      id: "a1111111-1111-4111-8111-111111111111",
      name: "Arthur Bennett",
      role: "owner",
      relationship: "Grandfather",
      birthYear: 1948,
      email: "arthur.bennett@synthetic.memoria.internal",
    },
    {
      id: "a2222222-2222-4222-8222-222222222222",
      name: "Eleanor Bennett",
      role: "editor",
      relationship: "Grandmother",
      birthYear: 1951,
      email: "eleanor.bennett@synthetic.memoria.internal",
    },
    {
      id: "a3333333-3333-4333-8333-333333333333",
      name: "David Bennett",
      role: "editor",
      relationship: "Father",
      birthYear: 1978,
      email: "david.bennett@synthetic.memoria.internal",
    },
    {
      id: "a4444444-4444-4444-8444-444444444444",
      name: "Sarah Bennett-Hayes",
      role: "editor",
      relationship: "Mother",
      birthYear: 1982,
      email: "sarah.bennett@synthetic.memoria.internal",
    },
    {
      id: "a5555555-5555-4555-8555-555555555555",
      name: "Maya Bennett",
      role: "contributor",
      relationship: "Daughter",
      birthYear: 2002,
      email: "maya.bennett@synthetic.memoria.internal",
    },
    {
      id: "a6666666-6666-4666-8666-666666666666",
      name: "Lucas Bennett",
      role: "viewer",
      relationship: "Son",
      birthYear: 2017,
      email: "lucas.bennett@synthetic.memoria.internal",
    },
  ];

  const memories: SyntheticMemoryData[] = [
    // 1. Family Gathering
    {
      id: "b1000000-0000-4000-8000-000000000001",
      spaceId,
      authorId: members[0].id,
      authorName: members[0].name,
      title: "Arthur & Eleanor Golden Anniversary Celebration",
      content:
        "Fifty years of devotion, laughter, and building our family hearth. All generations sat around the walnut dining table with candlelight and vintage albums.",
      format: "photo",
      capturedAt: "2024-06-15T18:30:00.000Z",
      location: "Oakridge Estate, Mill Valley, California",
      latitude: 37.906,
      longitude: -122.545,
      isFavorite: true,
      associatedPeople: ["Arthur Bennett", "Eleanor Bennett", "David Bennett", "Sarah Bennett-Hayes", "Maya Bennett", "Lucas Bennett"],
      tags: ["anniversary", "family", "golden-milestone", "heirloom"],
      scenario: "family_gathering",
      mediaFilenames: ["family_anniversary_portrait.jpg", "anniversary_toast.mp4"],
    },
    // 2. Travel Expedition
    {
      id: "b1000000-0000-4000-8000-000000000002",
      spaceId,
      authorId: members[2].id,
      authorName: members[2].name,
      title: "Emerald Bay Sunrise Canoe Expedition",
      content:
        "The lake was glassy and quiet at dawn. The morning mist rose between the granite peaks while Lucas dipped his paddle into the crystal-clear water.",
      format: "photo",
      capturedAt: "2025-07-22T06:15:00.000Z",
      location: "Lake Tahoe, Emerald Bay, California",
      latitude: 38.954,
      longitude: -120.098,
      isFavorite: true,
      associatedPeople: ["David Bennett", "Lucas Bennett"],
      tags: ["travel", "lake-tahoe", "nature", "summer-vacation"],
      scenario: "travel_expedition",
      mediaFilenames: ["lake_tahoe_sunrise.jpg", "tahoe_water_glide.mp4"],
    },
    // 3. Personal Milestone
    {
      id: "b1000000-0000-4000-8000-000000000003",
      spaceId,
      authorId: members[3].id,
      authorName: members[3].name,
      title: "Maya's University Commencement with Honors",
      content:
        "Tears of pride seeing Maya cross the historic stone quadrangle in her black and crimson gown. Our first granddaughter to graduate summa cum laude.",
      format: "photo",
      capturedAt: "2024-05-18T14:00:00.000Z",
      location: "Stanford Memorial Church Quad, California",
      latitude: 37.4275,
      longitude: -122.1697,
      isFavorite: true,
      associatedPeople: ["Maya Bennett", "Sarah Bennett-Hayes", "Arthur Bennett"],
      tags: ["graduation", "commencement", "pride", "education"],
      scenario: "personal_milestone",
      mediaFilenames: ["maya_graduation_portrait.jpg"],
    },
    // 4. Daily Lifestyle & Heirloom
    {
      id: "b1000000-0000-4000-8000-000000000004",
      spaceId,
      authorId: members[1].id,
      authorName: members[1].name,
      title: "Grandmother Eleanor's Autumn Veranda Baking",
      content:
        "The kitchen was filled with the scents of cinnamon, roasted apples, and slow-leavened sourdough bread. Oliver was lying by the kitchen mat waiting for crumbs.",
      format: "photo",
      capturedAt: "2024-10-12T11:45:00.000Z",
      location: "Bennett Family Homestead, Petaluma, California",
      latitude: 38.2324,
      longitude: -122.6367,
      isFavorite: false,
      associatedPeople: ["Eleanor Bennett", "Lucas Bennett"],
      tags: ["autumn", "baking", "sourdough", "cozy-home"],
      scenario: "daily_lifestyle",
      mediaFilenames: ["autumn_veranda_baking.jpg", "eleanor_story_voice_note.m4a", "bennett_heritage_notes.pdf"],
    },
    // 5. Lucas 7th Birthday
    {
      id: "b1000000-0000-4000-8000-000000000005",
      spaceId,
      authorId: members[2].id,
      authorName: members[2].name,
      title: "Lucas 7th Solar System Birthday Party",
      content:
        "Lucas blew out all seven candles on his handmade rocket cake in one breath. The backyard telescope showed the rings of Saturn to all the neighborhood kids.",
      format: "photo",
      capturedAt: "2024-09-04T16:20:00.000Z",
      location: "Bennett Backyard, Mill Valley, California",
      latitude: 37.906,
      longitude: -122.545,
      isFavorite: true,
      associatedPeople: ["Lucas Bennett", "David Bennett", "Sarah Bennett-Hayes"],
      tags: ["birthday", "childhood", "astronomy", "celebration"],
      scenario: "family_gathering",
      mediaFilenames: ["lucas_birthday_cake.jpg"],
    },
    // 6. Kyoto Bamboo Grove
    {
      id: "b1000000-0000-4000-8000-000000000006",
      spaceId,
      authorId: members[4].id,
      authorName: members[4].name,
      title: "Morning Silence in Arashiyama Bamboo Grove",
      content:
        "Walking at 6:30 AM before anyone else arrived. The green light filtering through tall stalks created an almost sacred stillness.",
      format: "photo",
      capturedAt: "2023-11-05T06:30:00.000Z",
      location: "Arashiyama, Kyoto, Japan",
      latitude: 35.0166,
      longitude: 135.6713,
      isFavorite: false,
      associatedPeople: ["Maya Bennett"],
      tags: ["kyoto", "japan", "travel", "solitude", "nature"],
      scenario: "travel_expedition",
      mediaFilenames: ["kyoto_bamboo_walk.jpg"],
    },
  ];

  return {
    id: spaceId,
    name: "The Bennett Family Archive",
    description: "Centuries of heirloom memories, milestones, and gatherings preserved for future generations.",
    motto: "In Every Memory, A Timeless Bond",
    members,
    memories,
  };
}

