import { Collection, ObjectId } from "mongodb";
import { UserModel } from "./types.ts";
import { GraphQLError } from "graphql";
type Context = {
  UserCollection: Collection<UserModel>;
};

type QueryUserArgs = {
  email: string;
};

type MutationAddUserArgs = {
  name: string;
  email: string;
  friends: string[];
};
export const resolvers = {
  Query: {
    users: async (
      _: unknown,
      __: unknown,
      ctx: Context,
    ): Promise<UserModel[]> => {
      return await ctx.UserCollection.find().toArray();
    },
    user: async (
      _: unknown,
      args: QueryUserArgs,
      ctx: Context,
    ): Promise<UserModel | null> => {
      const email = args.email;

      return await ctx.UserCollection.findOne({ email });
    },
  },

  Mutation: {
    addUser: async (
      _: unknown,
      args: MutationAddUserArgs,
      ctx: Context,
    ): Promise<UserModel> => {
      const { name, email, friends } = args;

      const userExists = await ctx.UserCollection.findOne({ email });
      if (userExists) throw new GraphQLError("User exists");

      const friendExists = await ctx.UserCollection.find({
        _id: { $in: friends.map((f) => new ObjectId(f)) },
      }).toArray();
      if (friendExists.length !== friends.length) {
        throw new GraphQLError("Not all friends exists");
      }

      const user = await ctx.UserCollection.insertOne({
        name,
        email,
        friends: friends.map((f) => new ObjectId(f)),
      });

      return {
        _id: user.insertedId,
        name,
        email,
        friends: friends.map((f) => new ObjectId(f)),
      };
    },
  },

  User: {
    id: (parent: UserModel) => {
      return parent._id!.toString();
    },

    friends: async (parent: UserModel, _: unknown, ctx: Context) => {
      const ids = parent.friends;
      return await ctx.UserCollection.find({ _id: { $in: ids } }).toArray();
    },

    numberOfFriends: (parent: UserModel) => {
      return parent.friends.length;
    },
  },
};
