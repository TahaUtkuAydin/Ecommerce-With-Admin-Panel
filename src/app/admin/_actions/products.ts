"use server";
import prisma from "@/db/db";
import { z } from "zod";
import fs from "fs/promises";
import { notFound, redirect } from "next/navigation";

// formData dan gelen File şeklinde tam uyuyor
const fileSchema = z.instanceof(File, { message: "Required" });
const imageSchema = fileSchema.refine(
  (file) => file.size === 0 || file.type.startsWith("image/")
);
//ilk önce size bakacak 0 ise false eğer >0 ise de jpg mi png mi check yapacak

const addSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  priceInCents: z.coerce.number().int().min(1),
  file: fileSchema.refine((file) => file.size > 0, "Required"),
  image: imageSchema.refine((file) => file.size > 0, "Required"),
});
// coerce stringi numbera çeviriyor yapamazsa false verir formData'dan gelen string hepsi

export default async function addProduct(
  prevState: unknown,
  formData: FormData
) {
  const result = addSchema.safeParse(Object.fromEntries(formData.entries())); // burası formData yı key value obje haline getiriyor
  console.log("fds", result.error?.message);

  if (result.success === false) {
    return result.error.formErrors.fieldErrors; // bu fieldErrors her biri için hatayı göstertir
  }
  const data = result.data;

  await fs.mkdir("products", { recursive: true });
  const filePath = `products/${crypto.randomUUID()}-${data.file.name}`; //adresi olusturuoyruz
  await fs.writeFile(filePath, Buffer.from(await data.file.arrayBuffer())); // Nodejs buffer nesnesi kullanır. o yüzden ceviriyoruz

  await fs.mkdir("public/products", { recursive: true });
  const imagePath = `/products/${crypto.randomUUID()}-${data.image.name}`;
  await fs.writeFile(
    `public${imagePath}`,
    Buffer.from(await data.file.arrayBuffer())
  );

  await prisma.product.create({
    data: {
      isAvailableForPurchase: false,
      name: data.name,
      description: data.description,
      priceInCents: data.priceInCents,
      filePath,
      imagePath,
    },
  });

  redirect("/admin/products");
}

const editSchema = addSchema.extend({
  file: fileSchema.optional(),
  image: imageSchema.optional(),
});

export async function updateProduct(
  id: string,
  prevState: unknown,
  formData: FormData
) {
  const result = editSchema.safeParse(Object.fromEntries(formData.entries())); // burası formData yı key value obje haline getiriyor

  if (result.success === false) {
    return result.error.formErrors.fieldErrors; // bu fieldErrors her biri için hatayı göstertir
  }

  const data = result.data;

  const product = await prisma.product.findUnique({ where: { id } });

  if (product == null) return notFound();
  
  let filePath = product.filePath;
  //filePathler sadece değiştiğinde update yapıcaz
  if (data.file != null && data.file.size > 0) {
    await fs.unlink(product.filePath);
    filePath = `products/${crypto.randomUUID()}-${data.file.name}`; //adresi olusturuoyruz
    await fs.writeFile(filePath, Buffer.from(await data.file.arrayBuffer())); // Nodejs buffer nesnesi kullanır. o yüzden ceviriyoruz
  }

  let imagePath = product.imagePath;
  if (data.image != null && data.image.size > 0) {
    await fs.unlink(`public${product.imagePath}`);
    imagePath = `/products/${crypto.randomUUID()}-${data.image.name}`; 
    await fs.writeFile(
      `public${imagePath}`,
      Buffer.from(await data.image.arrayBuffer())
    ); 
  }

  await prisma.product.update({
    where:{id},
    data: {
      name: data.name,
      description: data.description,
      priceInCents: data.priceInCents,
      filePath,
      imagePath,
    },
  });

  redirect("/admin/products");
}

export async function toggleProductAvailability(
  id: string,
  isAvailableForPurchase: boolean
) {
  await prisma.product.update({
    where: { id },
    data: { isAvailableForPurchase },
  });
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.delete({
    where: { id },
  });

  if (product == null) return notFound();

  await fs.unlink(product.filePath);
  await fs.unlink(`public${product.imagePath}`);
}
