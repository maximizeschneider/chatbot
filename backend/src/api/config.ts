import { Router } from 'express';

interface ConfigOption {
  name: string;
  publishedToMain: boolean;
  someShit: string;
}

const router = Router();

const DUMMY_CONFIGS: ConfigOption[] = [
  { name: 'Production Config', publishedToMain: false, someShit: 'some shit'  },
  { name: 'Development Config', publishedToMain: true, someShit: 'some shit' },
  { name: 'Test Config', publishedToMain: false, someShit: 'some shit' }
];

router.get('/', (_req, res) => {
  res.json(DUMMY_CONFIGS);
});

export const configRouter = router;
