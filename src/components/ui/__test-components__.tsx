/**
 * Test file to verify all shadcn/ui components are properly installed
 * This file is for verification purposes only and can be deleted
 */

import { Button } from './button';
import { Input } from './input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './table';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './form';
import { Label } from './label';
import { Textarea } from './textarea';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from './navigation-menu';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';
import { Toaster } from './sonner';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { Badge } from './badge';

export function TestComponents() {
  return (
    <div className="space-y-8 p-8">
      <h1 className="text-3xl font-bold">shadcn/ui Components Test</h1>

      {/* Basic Components */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Basic Components</h2>
        <div className="space-y-4">
          <Button>Button</Button>
          <Input placeholder="Input" />
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card Description</CardDescription>
            </CardHeader>
            <CardContent>Card Content</CardContent>
            <CardFooter>Card Footer</CardFooter>
          </Card>
        </div>
      </section>

      {/* Form Components */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Form Components</h2>
        <div className="space-y-4">
          <Label>Label</Label>
          <Textarea placeholder="Textarea" />
        </div>
      </section>

      {/* Navigation Components */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Navigation Components</h2>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Current</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </section>

      {/* Feedback Components */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Feedback Components</h2>
        <div className="space-y-4">
          <Alert>
            <AlertTitle>Alert Title</AlertTitle>
            <AlertDescription>Alert Description</AlertDescription>
          </Alert>
          <div className="flex gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </div>
      </section>

      {/* Table Component */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Table Component</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Header 1</TableHead>
              <TableHead>Header 2</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Cell 1</TableCell>
              <TableCell>Cell 2</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <Toaster />
    </div>
  );
}

// Export all components to verify imports work
export {
  Button,
  Input,
  Card,
  Dialog,
  Select,
  Table,
  Form,
  Label,
  Textarea,
  NavigationMenu,
  Breadcrumb,
  Toaster,
  Alert,
  Badge,
};
