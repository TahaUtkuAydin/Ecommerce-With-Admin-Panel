"use server";
import prisma from "@/db/db";
import { z } from "zod";
import fs from "fs/promises";
import { redirect } from "next/navigation";

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

export default async function addProduct(formData: FormData) {
  const result = addSchema.safeParse(Object.fromEntries(formData.entries())); // burası formData yı key value obje haline getiriyor
  console.log("fds",result.error?.message);
  console.log("fds",formData);
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
      name: data.name,
      description: data.description,
      priceInCents: data.priceInCents,
      filePath,
      imagePath,
    },
  });

  redirect("/admin/products");
}
