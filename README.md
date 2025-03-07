# Simple KV

A simple key-value store backed by `better-sqlite3` and `better-serialize`.

Made as a simple replacement for [enmap](https://github.com/eslachance/enmap).

# Examples

```ts
import { SimpleKV } from "@jvvan/simple-kv";

interface User {
  name: string;
}

const kv = new SimpleKV<User>({ name: "users" });

kv.set("user1", { name: "John Doe" });
console.log(kv.get("user1")); // { name: "John Doe" }
console.log(kv.has("user1")); // true
console.log(kv.has("user2")); // false
kv.delete("user1")
console.log(kv.has("user1")); // false
```