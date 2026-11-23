using UnrealBuildTool;

public class Tamale3D : ModuleRules
{
    public Tamale3D(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",
            "EnhancedInput",
            "AIModule",
            "NavigationSystem",
            "UMG",
            "Slate",
            "SlateCore"
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "Json",
            "JsonUtilities"
        });

        // Lets "#include "Data/TamaleWorldTypes.h"" style paths resolve from Public/ and Private/.
        PublicIncludePaths.Add(ModuleDirectory + "/Public");
        PrivateIncludePaths.Add(ModuleDirectory);
    }
}
