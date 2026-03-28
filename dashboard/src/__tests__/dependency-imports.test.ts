import { describe, it, expect } from 'vitest';

describe('Dependency imports', () => {
  it('should resolve @react-three/postprocessing', async () => {
    const mod = await import('@react-three/postprocessing');
    expect(mod).toBeDefined();
    // EffectComposer is the primary export we need
    expect(mod.EffectComposer).toBeDefined();
  });

  it('should resolve postprocessing library', async () => {
    const mod = await import('postprocessing');
    expect(mod).toBeDefined();
  });

  it('should resolve Shadcn Sheet component', async () => {
    const mod = await import('@/components/ui/sheet');
    expect(mod.Sheet).toBeDefined();
    expect(mod.SheetContent).toBeDefined();
    expect(mod.SheetTrigger).toBeDefined();
  });

  it('should resolve Shadcn Tabs component', async () => {
    const mod = await import('@/components/ui/tabs');
    expect(mod.Tabs).toBeDefined();
    expect(mod.TabsContent).toBeDefined();
    expect(mod.TabsList).toBeDefined();
    expect(mod.TabsTrigger).toBeDefined();
  });

  it('should resolve Shadcn Select component', async () => {
    const mod = await import('@/components/ui/select');
    expect(mod.Select).toBeDefined();
    expect(mod.SelectContent).toBeDefined();
    expect(mod.SelectItem).toBeDefined();
    expect(mod.SelectTrigger).toBeDefined();
    expect(mod.SelectValue).toBeDefined();
  });
});
