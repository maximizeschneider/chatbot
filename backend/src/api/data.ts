type ToolResultContent = {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  output: {
    type: "text";
    value: string;
  };
};

export type StoredConversation = {
  id: string;
  title: string;
};

export type StoredMessage = {
  id: string;
  conversationId: string;
  role: "assistant" | "user" | "tool";
  content: string | ToolResultContent[];
  createdAt: number;
};

const now = Date.now();

export const conversations: StoredConversation[] = [
  {
    id: "seed-1",
    title: "Welcome Conversation",
  },
  {
    id: "seed-2",
    title: "React Performance Tips",
  },
  {
    id: "seed-3",
    title: "TypeScript Best Practices",
  },
  {
    id: "seed-4",
    title: "Database Design",
  },
  {
    id: "seed-5",
    title: "API Development",
  },
];

export const messages: StoredMessage[] = [
  {
    id: "seed-1-message-1",
    conversationId: "seed-1",
    role: "assistant",
    content: "Hi there! I'm your AI assistant. How can I help you today?",
    createdAt: now - 1000 * 60 * 5,
  },
  {
    id: "seed-1-message-2",
    conversationId: "seed-1",
    role: "user",
    content: "What can you help me with?",
    createdAt: now - 1000 * 60 * 4,
  },
  {
    id: "seed-1-message-3",
    conversationId: "seed-1",
    role: "tool",
    content: [
      {
        type: "tool-result",
        toolCallId: "get-capabilities-1",
        toolName: "get_capabilities",
        output: {
          type: "text",
          value:
            "Available capabilities: code assistance, data analysis, general questions",
        },
      },
    ],
    createdAt: now - 1000 * 60 * 3,
  },
  {
    id: "seed-1-message-4",
    conversationId: "seed-1",
    role: "assistant",
    content:
      "I can help you with several things including:\n1. Code assistance\n2. Data analysis\n3. General questions\nWhat would you like to explore?",
    createdAt: now - 1000 * 60 * 2,
  },
  // React Performance Tips conversation
  {
    id: "seed-2-message-1",
    conversationId: "seed-2",
    role: "user",
    content: "How can I optimize React component rendering?",
    createdAt: now - 1000 * 60 * 30,
  },
  {
    id: "seed-2-message-2",
    conversationId: "seed-2",
    role: "assistant",
    content:
      "Here are key strategies to optimize React rendering:\n1. **Memoization**: Use React.memo() for expensive components\n2. **useMemo**: Cache expensive computations\n3. **useCallback**: Maintain stable function references\n4. **Code Splitting**: Split large bundles with React.lazy()\n5. **Virtual Scrolling**: For long lists\n\nWould you like me to explain any of these in detail?",
    createdAt: now - 1000 * 60 * 29,
  },
  {
    id: "seed-2-message-3",
    conversationId: "seed-2",
    role: "user",
    content: "Can you show me an example of React.memo?",
    createdAt: now - 1000 * 60 * 28,
  },
  {
    id: "seed-2-message-4",
    conversationId: "seed-2",
    role: "assistant",
    content:
      "Sure! Here's an example:\n\n```typescript\nconst MyComponent = React.memo(({ name, count }) => {\n  return <div>{name}: {count}</div>;\n});\n```\n\nReact.memo prevents re-renders when props haven't changed. Use it for expensive child components.",
    createdAt: now - 1000 * 60 * 27,
  },
  {
    id: "seed-2-message-5",
    conversationId: "seed-2",
    role: "user",
    content: "What about useMemo vs useCallback? When should I use each?",
    createdAt: now - 1000 * 60 * 26,
  },
  {
    id: "seed-2-message-6",
    conversationId: "seed-2",
    role: "assistant",
    content:
      "Great question! They serve different purposes:\n\n**useMemo** - Memoizes computed values:\n```typescript\nconst expensiveValue = useMemo(() => {\n  return heavyCalculation(data);\n}, [data]);\n```\n\n**useCallback** - Memoizes function references:\n```typescript\nconst handleClick = useCallback(() => {\n  doSomething(id);\n}, [id]);\n```\n\nUse useMemo for expensive calculations, useCallback for functions passed as props to prevent child re-renders.",
    createdAt: now - 1000 * 60 * 25,
  },
  {
    id: "seed-2-message-7",
    conversationId: "seed-2",
    role: "user",
    content: "How do I implement virtual scrolling for a large list?",
    createdAt: now - 1000 * 60 * 24,
  },
  {
    id: "seed-2-message-8",
    conversationId: "seed-2",
    role: "assistant",
    content:
      "Virtual scrolling only renders visible items. Here's a basic implementation:\n\n```typescript\nconst VirtualList = ({ items, itemHeight, containerHeight }) => {\n  const [scrollTop, setScrollTop] = useState(0);\n  \n  const visibleStart = Math.floor(scrollTop / itemHeight);\n  const visibleEnd = Math.min(\n    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,\n    items.length\n  );\n  \n  const visibleItems = items.slice(visibleStart, visibleEnd);\n  \n  return (\n    <div \n      style={{ height: containerHeight, overflow: 'auto' }}\n      onScroll={(e) => setScrollTop(e.target.scrollTop)}\n    >\n      <div style={{ height: items.length * itemHeight }}>\n        {visibleItems.map((item, index) => (\n          <div key={visibleStart + index} style={{ height: itemHeight }}>\n            {item.content}\n          </div>\n        ))}\n      </div>\n    </div>\n  );\n};\n```\n\nFor production, consider libraries like react-window or react-virtualized.",
    createdAt: now - 1000 * 60 * 23,
  },
  {
    id: "seed-2-message-9",
    conversationId: "seed-2",
    role: "user",
    content: "What about code splitting? How do I implement it?",
    createdAt: now - 1000 * 60 * 22,
  },
  {
    id: "seed-2-message-10",
    conversationId: "seed-2",
    role: "assistant",
    content:
      "Code splitting reduces initial bundle size by loading code on-demand:\n\n**Route-based splitting:**\n```typescript\nconst Home = lazy(() => import('./Home'));\nconst About = lazy(() => import('./About'));\n\nfunction App() {\n  return (\n    <Suspense fallback={<div>Loading...</div>}>\n      <Routes>\n        <Route path=\"/\" element={<Home />} />\n        <Route path=\"/about\" element={<About />} />\n      </Routes>\n    </Suspense>\n  );\n}\n```\n\n**Component-based splitting:**\n```typescript\nconst HeavyComponent = lazy(() => import('./HeavyComponent'));\n\n// Load when needed\n{showHeavy && (\n  <Suspense fallback={<Spinner />}>\n    <HeavyComponent />\n  </Suspense>\n)}\n```\n\nThis significantly improves initial load time!",
    createdAt: now - 1000 * 60 * 21,
  },
  {
    id: "seed-2-message-11",
    conversationId: "seed-2",
    role: "user",
    content: "Any other performance tips I should know?",
    createdAt: now - 1000 * 60 * 20,
  },
  {
    id: "seed-2-message-12",
    conversationId: "seed-2",
    role: "assistant",
    content:
      "Here are additional performance optimizations:\n\n**1. Avoid inline objects/functions in JSX:**\n```typescript\n// ❌ Bad - creates new object on every render\n<div style={{ margin: '10px' }} />\n\n// ✅ Good - stable reference\nconst styles = { margin: '10px' };\n<div style={styles} />\n```\n\n**2. Use React DevTools Profiler** to identify bottlenecks\n\n**3. Consider state colocation** - keep state close to where it's used\n\n**4. Use React.memo with custom comparison:**\n```typescript\nconst MyComponent = React.memo(({ data }) => {\n  return <div>{data.name}</div>;\n}, (prevProps, nextProps) => {\n  return prevProps.data.id === nextProps.data.id;\n});\n```\n\n**5. Optimize images** with lazy loading and proper formats\n\n**6. Use production builds** - they're much faster than development mode",
    createdAt: now - 1000 * 60 * 19,
  },
  // TypeScript Best Practices conversation
  {
    id: "seed-3-message-1",
    conversationId: "seed-3",
    role: "user",
    content: "What are TypeScript best practices for type safety?",
    createdAt: now - 1000 * 60 * 60,
  },
  {
    id: "seed-3-message-2",
    conversationId: "seed-3",
    role: "assistant",
    content:
      "TypeScript best practices for type safety:\n1. **Strict Mode**: Enable strict: true in tsconfig.json\n2. **Avoid any**: Use unknown or specific types\n3. **Use Interfaces**: Define clear contracts\n4. **Discriminated Unions**: For type-safe state\n5. **Generics**: For reusable type-safe code\n6. **Const Assertions**: For literal types\n\nWhat aspect interests you most?",
    createdAt: now - 1000 * 60 * 59,
  },
  {
    id: "seed-3-message-3",
    conversationId: "seed-3",
    role: "user",
    content: "Tell me about discriminated unions",
    createdAt: now - 1000 * 60 * 58,
  },
  {
    id: "seed-3-message-4",
    conversationId: "seed-3",
    role: "assistant",
    content:
      "Discriminated unions create type-safe state management:\n\n```typescript\ntype Result = \n  | { status: 'success'; data: string }\n  | { status: 'error'; error: Error }\n  | { status: 'loading' };\n\nfunction handle(result: Result) {\n  if (result.status === 'success') {\n    console.log(result.data);\n  }\n}\n```\n\nTypeScript narrows the type based on the discriminator field.",
    createdAt: now - 1000 * 60 * 57,
  },
  // Database Design conversation
  {
    id: "seed-4-message-1",
    conversationId: "seed-4",
    role: "user",
    content: "What's the best approach for database normalization?",
    createdAt: now - 1000 * 60 * 90,
  },
  {
    id: "seed-4-message-2",
    conversationId: "seed-4",
    role: "assistant",
    content:
      "Database normalization reduces redundancy and improves data integrity:\n\n**Normal Forms:**\n1. **1NF**: Atomic values, no repeating groups\n2. **2NF**: 1NF + remove partial dependencies\n3. **3NF**: 2NF + remove transitive dependencies\n4. **BCNF**: Stricter than 3NF\n\nMost applications aim for 3NF. NoSQL databases denormalize for performance.",
    createdAt: now - 1000 * 60 * 89,
  },
  {
    id: "seed-4-message-3",
    conversationId: "seed-4",
    role: "user",
    content: "Should I normalize everything?",
    createdAt: now - 1000 * 60 * 88,
  },
  {
    id: "seed-4-message-4",
    conversationId: "seed-4",
    role: "assistant",
    content:
      "Not always. Consider trade-offs:\n\n**Normalize when:**\n- Write performance is critical\n- Data integrity is important\n- Storage space matters\n\n**Denormalize when:**\n- Read performance is critical\n- Complex joins are expensive\n- Reporting queries dominate\n\nBalance normalization with your access patterns.",
    createdAt: now - 1000 * 60 * 87,
  },
  // API Development conversation
  {
    id: "seed-5-message-1",
    conversationId: "seed-5",
    role: "user",
    content: "How do I design a RESTful API?",
    createdAt: now - 1000 * 60 * 120,
  },
  {
    id: "seed-5-message-2",
    conversationId: "seed-5",
    role: "assistant",
    content:
      "RESTful API design principles:\n\n1. **Use HTTP Methods**: GET, POST, PUT, DELETE, PATCH\n2. **Resource-oriented URLs**: /users, /users/:id\n3. **Meaningful Status Codes**: 200, 201, 400, 404, 500\n4. **Versioning**: /v1/users or Accept header\n5. **Pagination**: limit, offset or cursor-based\n6. **Error Responses**: Consistent error format\n7. **Authentication**: Bearer tokens, API keys\n\nWhat area would you like details on?",
    createdAt: now - 1000 * 60 * 119,
  },
  {
    id: "seed-5-message-3",
    conversationId: "seed-5",
    role: "user",
    content: "How should I handle pagination?",
    createdAt: now - 1000 * 60 * 118,
  },
  {
    id: "seed-5-message-4",
    conversationId: "seed-5",
    role: "assistant",
    content:
      "Two common pagination approaches:\n\n**Offset-based:**\n```\nGET /users?limit=10&offset=20\n```\nSimple but inefficient for large datasets.\n\n**Cursor-based:**\n```\nGET /users?limit=10&cursor=abc123\n```\nMore efficient, better for real-time data.\n\nCursor-based is recommended for production APIs.",
    createdAt: now - 1000 * 60 * 117,
  },
];
