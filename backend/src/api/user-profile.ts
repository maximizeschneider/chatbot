import { Router } from 'express';

interface UserProfile {
  name: string;
  someShit: string;
}

const router = Router();

const DUMMY_PROFILES: UserProfile[] = [
  { name: 'John Developer', someShit: 'some shit' },
  { name: 'Alice Admin', someShit: 'some shit' },
  { name: 'Bob User', someShit: 'some shit' }
];

router.get('/', (_req, res) => {
  res.json(DUMMY_PROFILES);
});

export const userProfileRouter = router;
