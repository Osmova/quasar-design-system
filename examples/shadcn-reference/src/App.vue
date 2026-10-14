<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { PhPlus, PhHouse, PhFolder, PhGearSix } from '@phosphor-icons/vue'
import { Button } from '@/registry/new-york-v4/ui/button'
import { Input } from '@/registry/new-york-v4/ui/input'
import { Checkbox } from '@/registry/new-york-v4/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/registry/new-york-v4/ui/radio-group'
import { Switch } from '@/registry/new-york-v4/ui/switch'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/registry/new-york-v4/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/registry/new-york-v4/ui/tabs'
import { Badge } from '@/registry/new-york-v4/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/registry/new-york-v4/ui/card'
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/registry/new-york-v4/ui/table'
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/registry/new-york-v4/ui/dropdown-menu'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/registry/new-york-v4/ui/dialog'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarSeparator } from '@/registry/new-york-v4/ui/sidebar'
import { PALETTE_NAMES } from './palettes'
import { state, reference, fixtureRevision, menuOpen, dialogOpen, selectOpen, settle, type Family } from './reference'

const visible = (family: Family) => state.family === 'all' || state.family === family
const buttonVariants = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const
const buttonSizes = ['xs', 'sm', 'default', 'lg'] as const
const badgeVariants = ['default', 'secondary', 'outline', 'destructive'] as const
const name = ref('Alex Morgan')
const checked = ref(true)
const enabled = ref(true)
const density = ref('comfortable')
const fruit = ref('apple')
const tab = ref('account')
const showStatus = ref(true)
const menuDensity = ref('comfortable')
const invoices = [
  { id: 'INV001', status: 'Paid', method: 'Credit Card', amount: '$250.00' },
  { id: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
  { id: 'INV003', status: 'Unpaid', method: 'Bank Transfer', amount: '$350.00' },
]

watch(fixtureRevision, () => {
  name.value = 'Alex Morgan'
  checked.value = enabled.value = showStatus.value = true
  density.value = menuDensity.value = 'comfortable'
  fruit.value = 'apple'
  tab.value = 'account'
})
onMounted(settle)
</script>

<template>
  <div class="reference-shell" data-reference-root :data-mode="state.mode" :data-palette="state.palette">
    <header class="reference-toolbar" data-reference-chrome>
      <div>
        <h1 class="text-xl font-semibold">shadcn-vue reference</h1>
        <p class="reference-caption">New York v4 · pinned source · local Inter / Phosphor</p>
      </div>
      <div class="reference-row">
        <label class="reference-field">
          Palette
          <select aria-label="Reference palette" class="rounded-md border bg-background px-3 py-2" :value="state.palette" @change="reference.setPalette(($event.target as HTMLSelectElement).value as typeof state.palette)">
            <option v-for="palette in PALETTE_NAMES" :key="palette" :value="palette">{{ palette }}</option>
          </select>
        </label>
        <label class="reference-field">
          Mode
          <select aria-label="Reference mode" class="rounded-md border bg-background px-3 py-2" :value="state.mode" @change="reference.setMode(($event.target as HTMLSelectElement).value as typeof state.mode)">
            <option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>
      </div>
    </header>

    <main class="reference-grid" aria-label="Pinned component fixtures">
      <section v-show="visible('button')" class="reference-family reference-wide" data-family="button" aria-labelledby="button-heading">
        <h2 id="button-heading">Buttons</h2>
        <div class="reference-stack">
          <div class="reference-row">
            <Button v-for="variant in buttonVariants" :key="variant" :variant="variant" :data-case="variant">{{ variant === 'default' ? 'Button' : variant[0].toUpperCase() + variant.slice(1) }}</Button>
          </div>
          <div class="reference-row">
            <Button v-for="size in buttonSizes" :key="size" :size="size" :data-case="`size-${size}`">Button</Button>
            <Button variant="outline" size="icon" aria-label="Add item" data-case="icon"><PhPlus /></Button>
            <Button disabled data-case="disabled">Disabled</Button>
            <Button aria-invalid="true" data-case="invalid">Invalid</Button>
          </div>
        </div>
      </section>

      <section v-show="visible('input')" class="reference-family" data-family="input" aria-labelledby="input-heading">
        <h2 id="input-heading">Inputs</h2>
        <div class="reference-stack">
          <label class="reference-field">Name<Input v-model="name" autocomplete="off" data-case="default" /></label>
          <label class="reference-field">Email<Input type="email" placeholder="name@example.com" autocomplete="off" data-case="placeholder" /></label>
          <label class="reference-field">Invalid email<Input model-value="not-an-email" aria-invalid="true" aria-describedby="invalid-help" data-case="invalid" /></label>
          <p id="invalid-help" class="text-sm text-destructive">Enter a valid email address.</p>
          <label class="reference-field">Disabled<Input model-value="Unavailable" disabled data-case="disabled" /></label>
          <label class="reference-field">Read only<Input model-value="Read-only value" readonly data-case="readonly" /></label>
        </div>
      </section>

      <section v-show="visible('selection')" class="reference-family" data-family="selection" aria-labelledby="selection-heading">
        <h2 id="selection-heading">Selection</h2>
        <div class="reference-stack text-sm">
          <label class="reference-row"><Checkbox v-model="checked" data-case="checked" />Accept terms and conditions</label>
          <label class="reference-row"><Checkbox :model-value="false" data-case="unchecked" />Optional updates</label>
          <label class="reference-row"><Checkbox model-value="indeterminate" data-case="indeterminate" />Select all</label>
          <label class="reference-row"><Checkbox :model-value="true" disabled data-case="disabled" />Disabled selection</label>
          <RadioGroup v-model="density" aria-label="Display density" data-case="radio">
            <label class="reference-row"><RadioGroupItem value="comfortable" />Comfortable</label>
            <label class="reference-row"><RadioGroupItem value="compact" />Compact</label>
            <label class="reference-row"><RadioGroupItem value="disabled" disabled />Disabled</label>
          </RadioGroup>
          <label class="reference-row"><Switch v-model="enabled" data-case="switch-on" />Notifications</label>
          <label class="reference-row"><Switch :model-value="false" data-case="switch-off" />Airplane mode</label>
          <label class="reference-row"><Switch :model-value="true" disabled data-case="switch-disabled" />Disabled switch</label>
          <div class="reference-field">
            <label id="fruit-label">Fruit</label>
            <Select v-model="fruit" v-model:open="selectOpen">
              <SelectTrigger aria-labelledby="fruit-label" data-case="select"><SelectValue placeholder="Select a fruit" /></SelectTrigger>
              <SelectContent data-family="selection" data-case="select-popup">
                <SelectGroup><SelectLabel>Fruits</SelectLabel><SelectItem value="apple">Apple</SelectItem><SelectItem value="banana">Banana</SelectItem><SelectItem value="orange">Orange</SelectItem><SelectItem value="unavailable" disabled>Unavailable</SelectItem></SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section v-show="visible('tabs')" class="reference-family" data-family="tabs" aria-labelledby="tabs-heading">
        <h2 id="tabs-heading">Tabs</h2>
        <Tabs v-model="tab" class="w-full" data-case="default">
          <TabsList aria-label="Settings sections"><TabsTrigger value="account">Account</TabsTrigger><TabsTrigger value="password">Password</TabsTrigger><TabsTrigger value="disabled" disabled>Disabled</TabsTrigger></TabsList>
          <TabsContent value="account"><p class="text-sm">Make changes to your account here.</p></TabsContent>
          <TabsContent value="password"><p class="text-sm">Change your password here.</p></TabsContent>
        </Tabs>
      </section>

      <section v-show="visible('badge')" class="reference-family" data-family="badge" aria-labelledby="badge-heading">
        <h2 id="badge-heading">Badges</h2>
        <div class="reference-row"><Badge v-for="variant in badgeVariants" :key="variant" :variant="variant" :data-case="variant">{{ variant === 'default' ? 'Badge' : variant[0].toUpperCase() + variant.slice(1) }}</Badge></div>
      </section>

      <section v-show="visible('card')" class="reference-family" data-family="card" aria-labelledby="card-heading">
        <h2 id="card-heading">Card</h2>
        <Card data-case="default">
          <CardHeader><CardTitle>Create project</CardTitle><CardDescription>Deploy your new project in one click.</CardDescription></CardHeader>
          <CardContent><label class="reference-field">Name<Input model-value="My project" autocomplete="off" /></label></CardContent>
          <CardFooter class="justify-between"><Button variant="outline">Cancel</Button><Button>Deploy</Button></CardFooter>
        </Card>
      </section>

      <section v-show="visible('table')" class="reference-family" data-family="table" aria-labelledby="table-heading">
        <h2 id="table-heading">Table</h2>
        <Table data-case="default">
          <TableCaption>A list of your recent invoices.</TableCaption>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead>Method</TableHead><TableHead class="text-right">Amount</TableHead></TableRow></TableHeader>
          <TableBody><TableRow v-for="invoice in invoices" :key="invoice.id" :data-state="invoice.id === 'INV001' ? 'selected' : undefined"><TableCell class="font-medium">{{ invoice.id }}</TableCell><TableCell>{{ invoice.status }}</TableCell><TableCell>{{ invoice.method }}</TableCell><TableCell class="text-right">{{ invoice.amount }}</TableCell></TableRow></TableBody>
          <TableFooter><TableRow><TableCell colspan="3">Total</TableCell><TableCell class="text-right">$750.00</TableCell></TableRow></TableFooter>
        </Table>
      </section>

      <section v-show="visible('menu')" class="reference-family" data-family="menu" aria-labelledby="menu-heading">
        <h2 id="menu-heading">Menu</h2>
        <DropdownMenu v-model:open="menuOpen">
          <DropdownMenuTrigger as-child><Button variant="outline" data-case="trigger">Open menu</Button></DropdownMenuTrigger>
          <DropdownMenuContent class="w-56" align="start" data-family="menu" data-case="popup">
            <DropdownMenuLabel>My account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut></DropdownMenuItem>
            <DropdownMenuItem disabled>Billing</DropdownMenuItem>
            <DropdownMenuCheckboxItem v-model="showStatus">Show status bar</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup v-model="menuDensity"><DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem><DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem></DropdownMenuRadioGroup>
            <DropdownMenuSub><DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger><DropdownMenuSubContent data-family="menu"><DropdownMenuItem>Settings</DropdownMenuItem><DropdownMenuItem>Help</DropdownMenuItem></DropdownMenuSubContent></DropdownMenuSub>
            <DropdownMenuSeparator /><DropdownMenuItem variant="destructive">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section v-show="visible('dialog')" class="reference-family" data-family="dialog" aria-labelledby="dialog-heading">
        <h2 id="dialog-heading">Dialog</h2>
        <Dialog v-model:open="dialogOpen">
          <DialogTrigger as-child><Button variant="outline" data-case="trigger">Edit profile</Button></DialogTrigger>
          <DialogContent data-family="dialog" data-case="popup">
            <DialogHeader><DialogTitle>Edit profile</DialogTitle><DialogDescription>Make changes to your profile here. Click save when you are done.</DialogDescription></DialogHeader>
            <label class="reference-field">Name<Input v-model="name" autocomplete="off" /></label>
            <DialogFooter><DialogClose as-child><Button variant="outline">Cancel</Button></DialogClose><DialogClose as-child><Button>Save changes</Button></DialogClose></DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section v-show="visible('sidebar')" class="reference-family reference-wide" data-family="sidebar" aria-labelledby="sidebar-heading">
        <h2 id="sidebar-heading">Sidebar</h2>
        <div class="reference-sidebar">
          <SidebarProvider :default-open="true" :open="true" class="min-h-0" data-case="provider">
            <Sidebar collapsible="none" data-case="default">
              <SidebarHeader><span class="px-2 py-1 text-sm font-semibold">Acme workspace</span></SidebarHeader>
              <SidebarSeparator />
              <SidebarContent><SidebarGroup><SidebarGroupLabel>Application</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>
                <SidebarMenuItem><SidebarMenuButton :is-active="true"><PhHouse /><span>Home</span></SidebarMenuButton></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton><PhFolder /><span>Projects</span></SidebarMenuButton><SidebarMenuBadge>12</SidebarMenuBadge></SidebarMenuItem>
                <SidebarMenuItem><SidebarMenuButton disabled><PhGearSix /><span>Settings</span></SidebarMenuButton></SidebarMenuItem>
              </SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent>
              <SidebarFooter><span class="px-2 py-1 text-xs text-muted-foreground">Alex Morgan</span></SidebarFooter>
            </Sidebar>
            <div class="hidden min-w-0 flex-1 content-center p-6 sm:grid"><p class="text-sm text-muted-foreground">Workspace content</p></div>
          </SidebarProvider>
        </div>
      </section>
    </main>
  </div>
</template>
