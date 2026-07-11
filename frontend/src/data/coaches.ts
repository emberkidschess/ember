import type { Coach } from "@/components/shared/CoachCard";

/**
 * Shared coaches data source — change here and it propagates to all pages.
 */
export const COACHES: Coach[] = [
  {
    name: "Manish Kumar",
    title: "International Rated Player",
    experience: "5+ Years",
    speciality: "Middle Game Specialist",
    description:
      "Specializes in developing strong middle game strategies and positional understanding. Has helped numerous students improve their tactical awareness and overall chess performance through structured training programs.",
    image: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288911/chess-academy/man.jpg",
    achievements: [
      "Multiple state-level tournament performances",
      "Trained 500+ students across different skill levels",
      "Expert in middle game planning and execution",
      "Focus on building strong fundamentals",
      "Experience with both beginner and advanced players",
    ],
  },
    
  {
    name: "Priya Nair",
    title: "International Rated Player",
    experience: "8+ Years",
    speciality: "Endgame & Strategy",
    description:
      "Brings analytical precision that intermediate and advanced students find transformative. Her endgame frameworks have won dozens of critical matches.",
    image: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783288907/chess-academy/mam.png",
    achievements: [
      "National Women's Chess Champion 2020",
      "International title at age 16",
      "Author of 'Endgame Blueprints for Juniors'",
    ],
  },
   {
    name: "Rahul Sharma",
    title: "International Rated Player",
    experience: "5+ Years",
    speciality: "Tactical Training",
    description:
      "3 times state champion and rank holder with exceptional competitive record across multiple age categories. Rahul brings proven tournament experience and tactical expertise to develop young champions.",
    image: "https://res.cloudinary.com/aaa97ofg/image/upload/v1783791354/Screenshot_2026-07-11_at_11.04.26_PM_zlj4rw.png",
    achievements: [
      "U14 State Champion",
      "U15 - 2nd State",
      "U17 - 3rd State",
      "U17 School - 3rd",
      "2nd Skill Craft below 1800 - 6th in category",
    ],
  },
  
  
];
